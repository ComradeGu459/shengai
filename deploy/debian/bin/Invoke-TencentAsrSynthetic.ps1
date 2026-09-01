[CmdletBinding()]
param(
    [switch]$SelfTest,
    [switch]$Preflight,
    [switch]$PreCreateDiagnostic,
    [switch]$Execute,
    [string]$RunId,
    [string]$PlanSha256,
    [string]$ArchivePath,
    [string]$ExpectedArchiveSha256,
    [string]$BootstrapPath,
    [string]$BusinessPath,
    [string]$SourcePath,
    [string]$SecretCsvPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

class RunnerFailure : System.Exception {
    [string]$Code

    RunnerFailure([string]$Code) : base($Code) {
        $this.Code = $Code
    }
}

function Fail([string]$Code) {
    throw [RunnerFailure]::new($Code)
}

function Get-RepoRoot {
    return [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
}

function Get-InputDefaults {
    $repoRoot = Get-RepoRoot
    return [ordered]@{
        repo_root = $repoRoot
        archive_path = 'C:\tmp\qimao-terms-cloud-asr-04b-candidate-20260828.tar.gz'
        bootstrap_path = Join-Path $repoRoot 'deploy\debian\bin\asr-isolated-synthetic-bootstrap.mjs'
        business_path = Join-Path $repoRoot 'deploy\debian\bin\asr-isolated-synthetic-business.mjs'
        source_path = 'E:\七猫兼职\02_项目\05_妈妈是神在人间的分神\原始素材\视频\24.mp4'
        secret_csv_path = 'D:\ChromeCoreDownloads\SecretKey.csv'
        ssh_config_path = Join-Path $repoRoot 'deploy\ssh\qimao-test-server.conf'
        media_directory = Join-Path (Split-Path $repoRoot -Parent) 'qimao-asr-05l-media-r1'
        media_filename = 'episode-001.mp4'
    }
}

function Resolve-InputPath([string]$Supplied, [string]$Default) {
    if (-not [string]::IsNullOrWhiteSpace($Supplied)) {
        return $Supplied
    }
    return $Default
}

function Get-DerivedRunIdentity([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -notmatch '^[a-z0-9][a-z0-9_-]{7,80}$') {
        Fail 'RUN_ID_INVALID'
    }
    $token = $Value -replace '^asr-', ''
    if ([string]::IsNullOrWhiteSpace($token)) {
        Fail 'RUN_ID_INVALID'
    }
    $databaseToken = ($token -replace '[^a-z0-9]+', '_').Trim('_')
    if ([string]::IsNullOrWhiteSpace($databaseToken)) {
        Fail 'RUN_ID_INVALID'
    }
    return [ordered]@{
        run_id = $Value
        token = $token
        remote_root = "/tmp/qimao-asr-$token"
        env_dir = "/tmp/qimao-asr-$token/env"
        database = "qimao_asr_05a_$databaseToken"
    }
}

function Get-RequiredFile([string]$Path, [string]$Code, [bool]$RequireMjs = $false) {
    if ([string]::IsNullOrWhiteSpace($Path)) {
        Fail $Code
    }
    try {
        $item = Get-Item -LiteralPath $Path -ErrorAction Stop
    } catch {
        Fail $Code
    }
    if (-not $item.PSIsContainer -and $item.Length -ge 1) {
        if ($RequireMjs -and $item.Extension -ne '.mjs') {
            Fail 'HARNESS_EXTENSION_INVALID'
        }
        return $item
    }
    Fail $Code
}

function Resolve-ExpectedArchiveSha256([string]$Path, [string]$DefaultPath, [string]$Supplied) {
    if (-not [string]::IsNullOrWhiteSpace($Supplied)) {
        if ($Supplied -cnotmatch '^[0-9a-f]{64}$') { Fail 'ARCHIVE_EXPECTED_SHA_INVALID' }
        return $Supplied
    }
    if ([IO.Path]::GetFullPath($Path) -eq [IO.Path]::GetFullPath($DefaultPath)) {
        return 'e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30'
    }
    Fail 'ARCHIVE_EXPECTED_SHA_REQUIRED'
}

function Assert-ArchiveDigest([string]$Actual, [string]$Expected) {
    if ($Expected -cnotmatch '^[0-9a-f]{64}$') { Fail 'ARCHIVE_EXPECTED_SHA_INVALID' }
    if ($Actual -ne $Expected) { Fail 'ARCHIVE_SHA_MISMATCH' }
}

function Get-ArchiveEvidence([string]$Path, [string]$ExpectedSha256, [string]$DefaultPath) {
    $item = Get-RequiredFile $Path 'ARCHIVE_MISSING'
    $expected = Resolve-ExpectedArchiveSha256 $item.FullName $DefaultPath $ExpectedSha256
    try {
        $digest = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
    } catch {
        Fail 'ARCHIVE_HASH_FAILED'
    }
    Assert-ArchiveDigest $digest $expected
    return [ordered]@{
        name = $item.Name
        path = $item.FullName
        bytes = $item.Length
        sha256 = $digest
        expected_sha256 = $expected
    }
}

function Get-SecretSchemaEvidence([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path)) {
        Fail 'SECRET_CSV_MISSING'
    }
    try {
        $rows = @(Import-Csv -LiteralPath $Path -ErrorAction Stop)
    } catch {
        Fail 'SECRET_CSV_SCHEMA_INVALID'
    }
    if ($rows.Count -ne 1) {
        Fail 'SECRET_CSV_SCHEMA_INVALID'
    }
    $properties = @($rows[0].PSObject.Properties.Name)
    if ($properties.Count -ne 2 -or $properties[0] -ne 'SecretId' -or $properties[1] -ne 'SecretKey') {
        Fail 'SECRET_CSV_SCHEMA_INVALID'
    }
    if ([string]::IsNullOrWhiteSpace([string]$rows[0].SecretId) -or [string]::IsNullOrWhiteSpace([string]$rows[0].SecretKey)) {
        Fail 'SECRET_CSV_SCHEMA_INVALID'
    }
    return [ordered]@{
        schema = 'SecretId,SecretKey'
        rows = 1
        values_nonempty = $true
        values_emitted = $false
    }
}

function Resolve-ChildStageCode([string]$Stderr, [string]$FallbackCode, [string]$ExpectedComponent) {
    if ($ExpectedComponent -notin @('bootstrap', 'business') -or [string]::IsNullOrWhiteSpace($Stderr)) {
        return $FallbackCode
    }
    $lines = $Stderr -split "`r?`n"
    for ($index = $lines.Count - 1; $index -ge 0; $index--) {
        $line = $lines[$index].Trim()
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        try {
            $parsed = $line | ConvertFrom-Json -ErrorAction Stop
        } catch {
            continue
        }
        if ($null -eq $parsed -or $parsed -is [Array] -or $parsed -is [string] -or $parsed -is [ValueType]) {
            continue
        }
        $propertyNames = @($parsed.PSObject.Properties.Name)
        if ($propertyNames.Count -ne 3 -or $propertyNames -notcontains 'component' -or $propertyNames -notcontains 'outcome' -or $propertyNames -notcontains 'code') {
            continue
        }
        if ([string]$parsed.component -ne $ExpectedComponent -or [string]$parsed.outcome -ne 'blocked') {
            continue
        }
        $code = [string]$parsed.code
        if ($code -notmatch '^[A-Z][A-Z0-9_]{2,80}$') {
            continue
        }
        return $code
    }
    return $FallbackCode
}

function Invoke-ProcessArguments(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$Label,
    [string]$FailureCode = 'PROCESS_FAILED',
    [AllowNull()][string]$StandardInput,
    [string]$ChildComponent = ''
) {
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $FilePath
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.RedirectStandardInput = ($null -ne $StandardInput)
    foreach ($argument in $Arguments) {
        [void]$startInfo.ArgumentList.Add([string]$argument)
    }
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    try {
        try {
            if (-not $process.Start()) {
                Fail $FailureCode
            }
        } catch [RunnerFailure] {
            throw
        } catch {
            Fail $FailureCode
        }
        if ($null -ne $StandardInput) {
            $process.StandardInput.Write($StandardInput)
            $process.StandardInput.Close()
        }
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) {
            Fail (Resolve-ChildStageCode $stderr $FailureCode $ChildComponent)
        }
        return $stdout.Trim()
    } finally {
        $process.Dispose()
    }
}

function Invoke-SshArguments(
    [string]$ConfigPath,
    [string[]]$RemoteArguments,
    [AllowNull()][string]$StandardInput,
    [string]$FailureCode = 'PROCESS_FAILED',
    [string]$ChildComponent = ''
) {
    $arguments = [Collections.Generic.List[string]]::new()
    [void]$arguments.Add('-F')
    [void]$arguments.Add($ConfigPath)
    [void]$arguments.Add('qimao-test-server')
    foreach ($argument in $RemoteArguments) {
        [void]$arguments.Add([string]$argument)
    }
    return Invoke-ProcessArguments -FilePath 'ssh' -Arguments $arguments.ToArray() -Label 'ssh' -FailureCode $FailureCode -StandardInput $StandardInput -ChildComponent $ChildComponent
}

function Invoke-ScpArguments([string]$ConfigPath, [string[]]$LocalPaths, [string]$RemoteDirectory, [string]$FailureCode = 'PROCESS_FAILED') {
    $arguments = [Collections.Generic.List[string]]::new()
    [void]$arguments.Add('-F')
    [void]$arguments.Add($ConfigPath)
    foreach ($path in $LocalPaths) {
        [void]$arguments.Add([string]$path)
    }
    [void]$arguments.Add("qimao-test-server:$RemoteDirectory/")
    return Invoke-ProcessArguments -FilePath 'scp' -Arguments $arguments.ToArray() -Label 'scp' -FailureCode $FailureCode
}

function Get-SshConfigEvidence([string]$ConfigPath) {
    $config = Get-RequiredFile $ConfigPath 'SSH_CONFIG_MISSING'
    try {
        $output = Invoke-ProcessArguments -FilePath 'ssh' -Arguments @('-F', $config.FullName, '-G', 'qimao-test-server') -Label 'ssh-config' -FailureCode 'SSH_CONFIG_PARSE_FAILED'
    } catch [RunnerFailure] {
        if ($_.Exception.Code -eq 'SSH_CONFIG_PARSE_FAILED') { throw }
        Fail 'SSH_CONFIG_PARSE_FAILED'
    } catch {
        Fail 'SSH_CONFIG_PARSE_FAILED'
    }
    $values = @{}
    foreach ($line in ($output -split "`r?`n")) {
        if ($line -match '^(hostname|user|identityfile|batchmode|identitiesonly|stricthostkeychecking|connecttimeout)\s+(.+)$') {
            $values[$matches[1]] = $matches[2].Trim()
        }
    }
    if ($values['hostname'] -ne '103.36.63.67' -or $values['user'] -ne 'qimao-deploy' -or [string]::IsNullOrWhiteSpace($values['identityfile']) -or $values['batchmode'] -ne 'yes' -or $values['identitiesonly'] -ne 'yes' -or $values['stricthostkeychecking'] -notin @('yes', 'true') -or $values['connecttimeout'] -ne '15') {
        Fail 'SSH_CONFIG_POLICY_INVALID'
    }
    return [ordered]@{
        alias = 'qimao-test-server'
        config = 'deploy/ssh/qimao-test-server.conf'
        parsed = $true
        identity_file = '[redacted]'
        network_actions = 0
    }
}

function Get-TextSha256([string]$Text) {
    $hasher = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
        return ([Convert]::ToHexString($hasher.ComputeHash($bytes))).ToLowerInvariant()
    } finally {
        $hasher.Dispose()
    }
}

function Assert-Throws([scriptblock]$Action, [string]$ExpectedCode) {
    $matched = $false
    try {
        & $Action
    } catch {
        if ($_.Exception -is [RunnerFailure] -and $_.Exception.Code -eq $ExpectedCode) {
            $matched = $true
        } else {
            throw
        }
    }
    if (-not $matched) {
        Fail 'SELF_TEST_EXPECTED_FAILURE'
    }
}

function Join-RemotePath([string]$Base, [string]$Child) {
    return "$($Base.TrimEnd('/'))/$($Child.TrimStart('/'))"
}

function Get-ExecutionActions(
    [object]$Identity,
    [object]$Inputs,
    [object]$Archive,
    [object]$Bootstrap,
    [object]$Business,
    [bool]$PreCreateDiagnostic = $false
) {
    $root = $Identity.remote_root
    $remoteArchive = Join-RemotePath $root $Archive.name
    $remoteBootstrap = Join-RemotePath $root $Bootstrap.Name
    $remoteBusiness = Join-RemotePath $root $Business.Name
    $remoteMedia = Join-RemotePath $root $Inputs.media_filename
    $remoteProvider = Join-RemotePath $root 'provider.tmp'
    $release = Join-RemotePath $root 'release'
    return @(
        [ordered]@{ label = 'media.generate_once'; kind = 'local'; network = $false; external_write = $false; run_id = $Identity.run_id; remote_root = $root; local_directory = $Inputs.media_directory },
        [ordered]@{ label = 'remote.create_root'; kind = 'ssh'; network = $true; external_write = $true; run_id = $Identity.run_id; remote_root = $root },
        [ordered]@{ label = 'remote.transfer.scp'; kind = 'scp'; network = $true; external_write = $true; run_id = $Identity.run_id; remote_root = $root; target_directory = $root },
        [ordered]@{ label = 'remote.sha_verify'; kind = 'ssh'; network = $true; external_write = $false; run_id = $Identity.run_id; remote_root = $root; archive = $remoteArchive; media = $remoteMedia },
        [ordered]@{ label = 'remote.release_dir'; kind = 'ssh'; network = $true; external_write = $true; run_id = $Identity.run_id; remote_root = $root; release = $release },
        [ordered]@{ label = 'remote.extract'; kind = 'ssh'; network = $true; external_write = $true; run_id = $Identity.run_id; remote_root = $root; archive = $remoteArchive; release = $release },
        [ordered]@{ label = 'remote.env_install'; kind = 'ssh'; network = $true; external_write = $true; run_id = $Identity.run_id; remote_root = $root; env_dir = $Identity.env_dir },
        [ordered]@{ label = 'remote.provider_install'; kind = 'ssh-stdin'; network = $true; external_write = $true; run_id = $Identity.run_id; remote_root = $root; provider_source = $remoteProvider; provider_owner = 'qimao-deploy'; provider_group = 'qimao' },
        [ordered]@{ label = 'bootstrap.prepare'; kind = 'ssh'; network = $true; external_write = $true; run_id = $Identity.run_id; remote_root = $root; database = $Identity.database; release = $release },
        [ordered]@{ label = 'business.run'; kind = 'ssh'; network = $true; external_write = $true; business_mode = if ($PreCreateDiagnostic) { 'precreate_diagnostic' } else { 'execute' }; run_id = $Identity.run_id; remote_root = $root; database = $Identity.database; release = $release; sudo_user = 'qimao'; sudo_group = 'qimao' },
        [ordered]@{ label = 'finally.cleanup.database'; kind = 'cleanup'; network = $false; external_write = $false; run_id = $Identity.run_id; remote_root = $root; database = $Identity.database },
        [ordered]@{ label = 'finally.cleanup.root'; kind = 'cleanup'; network = $false; external_write = $false; run_id = $Identity.run_id; remote_root = $root },
        [ordered]@{ label = 'local.cleanup.media'; kind = 'cleanup'; network = $false; external_write = $false; run_id = $Identity.run_id; remote_root = $root; local_directory = $Inputs.media_directory }
    )
}

function Invoke-ActionSequence(
    [object[]]$Actions,
    [scriptblock]$Executor,
    [object]$Context = $null
) {
    if ($null -eq $Context) {
        $Context = [ordered]@{
            media_owned = $false
            root_owned = $false
            database_owned = $false
        }
    }
    $events = [Collections.Generic.List[object]]::new()
    $completedEvents = [Collections.Generic.List[string]]::new()
    $unknownEvents = [Collections.Generic.List[string]]::new()
    $cleanupErrors = [Collections.Generic.List[string]]::new()
    $primaryCode = $null
    $networkActions = 0
    $externalWrites = 0
    try {
        foreach ($action in @($Actions | Where-Object { $_.kind -ne 'cleanup' })) {
            $event = [ordered]@{ label = $action.label; status = 'started' }
            [void]$events.Add($event)
            if ($action.network) { $networkActions++ }
            if ($action.external_write) { $externalWrites++ }
            try {
                [void](& $Executor $action $Context)
                $event.status = 'completed'
                [void]$completedEvents.Add($action.label)
            } catch {
                $event.status = 'failed'
                if ($action.network -or $action.external_write) {
                    [void]$unknownEvents.Add($action.label)
                }
                $primaryCode = if ($_.Exception -is [RunnerFailure]) { $_.Exception.Code } else { 'EXECUTE_ACTION_FAILED' }
                break
            }
        }
    } finally {
        foreach ($action in @($Actions | Where-Object { $_.kind -eq 'cleanup' })) {
            $event = [ordered]@{ label = $action.label; status = 'started' }
            [void]$events.Add($event)
            try {
                [void](& $Executor $action $Context)
                $event.status = 'completed'
                [void]$completedEvents.Add($action.label)
            } catch {
                $event.status = 'failed'
                [void]$cleanupErrors.Add('CLEANUP_FAILED')
            }
        }
    }
    if ($null -eq $primaryCode -and $cleanupErrors.Count -gt 0) {
        $primaryCode = 'CLEANUP_FAILED'
    }
    return [ordered]@{
        events = $events.ToArray()
        completed_events = $completedEvents.ToArray()
        unknown_events = $unknownEvents.ToArray()
        primary_code = $primaryCode
        cleanup_errors = $cleanupErrors.ToArray()
        network_actions = $networkActions
        external_writes = $externalWrites
        real_external_calls = 0
        context = $Context
    }
}

function Invoke-SelfTest {
    $identity = Get-DerivedRunIdentity 'asr-05l-20260829-r1'
    if ($identity.remote_root -ne '/tmp/qimao-asr-05l-20260829-r1' -or $identity.env_dir -ne '/tmp/qimao-asr-05l-20260829-r1/env' -or $identity.database -ne 'qimao_asr_05a_05l_20260829_r1') {
        Fail 'SELF_TEST_DERIVATION_INVALID'
    }
    Assert-Throws { Get-DerivedRunIdentity 'bad' } 'RUN_ID_INVALID'

    $bootstrapStderr = "ssh: ordinary failure`n" + '{"component":"bootstrap","outcome":"blocked","code":"PROVIDER_INSTALL_FAILED"}'
    if ((Resolve-ChildStageCode $bootstrapStderr 'BOOTSTRAP_PREPARE_FAILED' 'bootstrap') -ne 'PROVIDER_INSTALL_FAILED') {
        Fail 'SELF_TEST_BOOTSTRAP_ERROR_PASSTHROUGH_INVALID'
    }
    $businessCatchStderr = '{"component":"business","outcome":"blocked","code":"ASR_CREATE_UNKNOWN"}'
    if ((Resolve-ChildStageCode $businessCatchStderr 'BUSINESS_RUN_FAILED' 'business') -ne 'ASR_CREATE_UNKNOWN') {
        Fail 'SELF_TEST_BUSINESS_ERROR_PASSTHROUGH_INVALID'
    }
    $businessOutput = '{"logger":"quiet"}' + [Environment]::NewLine + '{"component":"business","outcome":"precreate_ready","evidence":{"asrWorkerRunOnce":false}}'
    $businessParsed = Convert-BusinessStageJson $businessOutput 'precreate_ready'
    if ($businessParsed.component -ne 'business' -or $businessParsed.outcome -ne 'precreate_ready') {
        Fail 'SELF_TEST_BUSINESS_OUTPUT_PARSE_INVALID'
    }
    $businessOutputCases = @(
        @{ text = '{"component":"business","outcome":"precreate_ready"}' + [Environment]::NewLine + '{"component":"business","outcome":"precreate_ready"}'; expected = 'precreate_ready' },
        @{ text = ''; expected = 'precreate_ready' },
        @{ text = '{"component":"business","outcome":"completed"}'; expected = 'precreate_ready' },
        @{ text = 'not-json'; expected = 'precreate_ready' },
        @{ text = '[{"component":"business","outcome":"precreate_ready"}]'; expected = 'precreate_ready' }
    )
    foreach ($businessOutputCase in $businessOutputCases) {
        $caseText = [string]$businessOutputCase.text
        $caseExpected = [string]$businessOutputCase.expected
        Assert-Throws { Convert-BusinessStageJson $caseText $caseExpected } 'BUSINESS_OUTPUT_INVALID'
    }
    $completedBusiness = Convert-BusinessStageJson '{"component":"business","outcome":"completed"}' 'completed'
    if ($completedBusiness.outcome -ne 'completed') {
        Fail 'SELF_TEST_BUSINESS_COMPLETED_PARSE_INVALID'
    }
    if ((Resolve-ChildStageCode '{"component":"business","outcome":"blocked","code":"ASR_CREATE_NOT_ATTEMPTED"}' 'BUSINESS_RUN_FAILED' 'business') -ne 'ASR_CREATE_NOT_ATTEMPTED') {
        Fail 'SELF_TEST_BUSINESS_PRE_CREATE_CODE_INVALID'
    }
    $fallbackCases = @(
        @{ stderr = 'ordinary ssh failure'; fallback = 'BOOTSTRAP_PREPARE_FAILED'; component = 'bootstrap' },
        @{ stderr = '{"component":"worker","outcome":"blocked","code":"WORKER_FAILED"}'; fallback = 'BUSINESS_RUN_FAILED'; component = 'business' },
        @{ stderr = '{"component":"bootstrap","outcome":"completed","code":"BOOTSTRAP_FAILED"}'; fallback = 'BOOTSTRAP_PREPARE_FAILED'; component = 'bootstrap' },
        @{ stderr = '{"component":"bootstrap","outcome":"blocked","code":"bad-code"}'; fallback = 'BOOTSTRAP_PREPARE_FAILED'; component = 'bootstrap' },
        @{ stderr = '{"component":"bootstrap","outcome":"blocked","code":"PROVIDER_INSTALL_FAILED","extra":"reject"}'; fallback = 'BOOTSTRAP_PREPARE_FAILED'; component = 'bootstrap' },
        @{ stderr = '{"component":"business","outcome":"blocked","code":"ASR_CREATE_UNKNOWN","createRecTaskMaximum":1,"speechTextEmitted":false}'; fallback = 'BUSINESS_RUN_FAILED'; component = 'business' },
        @{ stderr = '{"component":"bootstrap","outcome":"blocked","code":"PROVIDER_INSTALL_FAILED"}'; fallback = 'BUSINESS_RUN_FAILED'; component = 'business' }
    )
    foreach ($fallbackCase in $fallbackCases) {
        if ((Resolve-ChildStageCode $fallbackCase.stderr $fallbackCase.fallback $fallbackCase.component) -ne $fallbackCase.fallback) {
            Fail 'SELF_TEST_ERROR_FALLBACK_INVALID'
        }
    }

    $inputs = [ordered]@{
        media_directory = '/tmp/qimao-asr-05l-self-test-media'
        media_filename = 'episode-001.mp4'
    }
    $defaultArchivePath = 'C:\tmp\qimao-terms-cloud-asr-04b-candidate-20260828.tar.gz'
    if ((Resolve-ExpectedArchiveSha256 $defaultArchivePath $defaultArchivePath '') -ne 'e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30') { Fail 'SELF_TEST_ARCHIVE_DEFAULT_SHA_INVALID' }
    $newArchiveSha = 'a' * 64
    if ((Resolve-ExpectedArchiveSha256 'C:\tmp\other-candidate.tar.gz' $defaultArchivePath $newArchiveSha) -ne $newArchiveSha) { Fail 'SELF_TEST_ARCHIVE_EXPLICIT_SHA_INVALID' }
    Assert-Throws { Resolve-ExpectedArchiveSha256 'C:\tmp\other-candidate.tar.gz' $defaultArchivePath '' } 'ARCHIVE_EXPECTED_SHA_REQUIRED'
    Assert-Throws { Resolve-ExpectedArchiveSha256 'C:\tmp\other-candidate.tar.gz' $defaultArchivePath ('A' * 64) } 'ARCHIVE_EXPECTED_SHA_INVALID'
    Assert-Throws { Assert-ArchiveDigest ('b' * 64) $newArchiveSha } 'ARCHIVE_SHA_MISMATCH'
    $archive = [pscustomobject]@{ name = 'candidate.tar.gz'; FullName = '/tmp/candidate.tar.gz'; bytes = 7; sha256 = ('a' * 64) }
    $bootstrap = [pscustomobject]@{ Name = 'bootstrap.mjs'; FullName = '/tmp/bootstrap.mjs' }
    $business = [pscustomobject]@{ Name = 'business.mjs'; FullName = '/tmp/business.mjs' }
    $actions = @(Get-ExecutionActions $identity $inputs $archive $bootstrap $business)
    $expectedLabels = @(
        'media.generate_once', 'remote.create_root', 'remote.transfer.scp', 'remote.sha_verify',
        'remote.release_dir', 'remote.extract', 'remote.env_install', 'remote.provider_install',
        'bootstrap.prepare', 'business.run', 'finally.cleanup.database', 'finally.cleanup.root',
        'local.cleanup.media'
    )
    $labels = @($actions | ForEach-Object { $_.label })
    if (($labels -join '|') -ne ($expectedLabels -join '|')) {
        Fail 'SELF_TEST_ACTION_SEQUENCE_INVALID'
    }
    if (@($actions | Where-Object { $_.run_id -ne $identity.run_id -or $_.remote_root -ne $identity.remote_root }).Count -ne 0) {
        Fail 'SELF_TEST_RUN_ID_DRIFT'
    }
    if (@($actions | Where-Object { $_.label -eq 'media.generate_once' }).Count -ne 1) {
        Fail 'SELF_TEST_MEDIA_COUNT_INVALID'
    }
    $providerAction = $actions | Where-Object { $_.label -eq 'remote.provider_install' }
    $businessAction = $actions | Where-Object { $_.label -eq 'business.run' }
    if ($providerAction.provider_group -ne 'qimao' -or $businessAction.sudo_user -ne 'qimao' -or $businessAction.sudo_group -ne 'qimao') {
        Fail 'SELF_TEST_IDENTITY_PLAN_INVALID'
    }
    $diagnosticActions = @(Get-ExecutionActions $identity $inputs $archive $bootstrap $business $true)
    $diagnosticBusinessAction = $diagnosticActions | Where-Object { $_.label -eq 'business.run' }
    if ($diagnosticBusinessAction.business_mode -ne 'precreate_diagnostic') {
        Fail 'SELF_TEST_PRECREATE_MODE_INVALID'
    }
    if (@($diagnosticActions | Where-Object { $_.label -ne 'business.run' -and $_.PSObject.Properties.Name -contains 'business_mode' }).Count -ne 0) {
        Fail 'SELF_TEST_PRECREATE_ACTION_DRIFT'
    }
    if (@($actions | Where-Object { $_.label -in @('finally.cleanup.cos', 'finally.cleanup.processes') }).Count -ne 0) {
        Fail 'SELF_TEST_FAKE_CLEANUP_ACTION'
    }
    $external = [ordered]@{ create_rec_task_maximum = 1; unknown = 'same_task_id_only' }
    if ($external.create_rec_task_maximum -ne 1 -or $external.unknown -ne 'same_task_id_only') {
        Fail 'SELF_TEST_EXTERNAL_POLICY_INVALID'
    }

    $mockState = @{ calls = 0 }
    $mockExecutor = {
        param($Action, $Context)
        $mockState.calls++
        switch ($Action.label) {
            'media.generate_once' { $Context.media_owned = $true }
            'remote.create_root' { $Context.root_owned = $true }
            'bootstrap.prepare' { $Context.database_owned = $true }
            'finally.cleanup.database' { if ($Context.database_owned) { $mockState.database_drops++; $Context.database_owned = $false } }
            'finally.cleanup.root' { if ($Context.root_owned) { $mockState.root_deletes++; $Context.root_owned = $false } }
            'local.cleanup.media' { if ($Context.media_owned) { $mockState.media_deletes++; $Context.media_owned = $false } }
        }
    }
    $mockState.database_drops = 0
    $mockState.root_deletes = 0
    $mockState.media_deletes = 0
    $happy = Invoke-ActionSequence $actions $mockExecutor
    $happyLabels = @($happy.events | ForEach-Object { $_.label })
    if ($happy.primary_code -ne $null -or ($happyLabels -join '|') -ne ($expectedLabels -join '|') -or $happy.unknown_events.Count -ne 0 -or $happy.real_external_calls -ne 0 -or $mockState.calls -ne $expectedLabels.Count -or $happy.network_actions -le 0 -or $happy.external_writes -le 0 -or $mockState.database_drops -ne 1 -or $mockState.root_deletes -ne 1 -or $mockState.media_deletes -ne 1) {
        Fail 'SELF_TEST_MOCK_HAPPY_INVALID'
    }

    $preserveState = @{ calls = 0; database_drops = 0; root_deletes = 0; media_deletes = 0 }
    $preserveContext = [ordered]@{ reconciliation_preserve = $false; identity = $identity; media_owned = $false; root_owned = $false; database_owned = $false }
    $preserveExecutor = {
        param($Action, $Context)
        $preserveState.calls++
        switch ($Action.label) {
            'media.generate_once' { $Context.media_owned = $true }
            'remote.create_root' { $Context.root_owned = $true }
            'bootstrap.prepare' { $Context.database_owned = $true }
            'business.run' { $Context.reconciliation_preserve = $true; throw [RunnerFailure]::new('ASR_CREATE_UNKNOWN') }
            'finally.cleanup.database' { if ($Context.database_owned -and -not $Context.reconciliation_preserve) { $preserveState.database_drops++ } }
            'finally.cleanup.root' { if ($Context.root_owned -and -not $Context.reconciliation_preserve) { $preserveState.root_deletes++ } }
            'local.cleanup.media' { if ($Context.media_owned) { $preserveState.media_deletes++; $Context.media_owned = $false } }
        }
    }
    $preserved = Invoke-ActionSequence $actions $preserveExecutor $preserveContext
    if ($preserved.primary_code -ne 'ASR_CREATE_UNKNOWN' -or $preserveState.database_drops -ne 0 -or $preserveState.root_deletes -ne 0 -or $preserveState.media_deletes -ne 1 -or -not $preserved.context.reconciliation_preserve) {
        Fail 'SELF_TEST_RECONCILIATION_PRESERVE_INVALID'
    }

    $failureState = @{ calls = 0; database_drops = 0; root_deletes = 0; media_deletes = 0 }
    $failureExecutor = {
        param($Action, $Context)
        $failureState.calls++
        switch ($Action.label) {
            'media.generate_once' { $Context.media_owned = $true }
            'remote.create_root' { $Context.root_owned = $true }
            'bootstrap.prepare' { Fail 'MOCK_BOOTSTRAP_STAGE' }
            'finally.cleanup.database' { if ($Context.database_owned) { $failureState.database_drops++ } }
            'finally.cleanup.root' { if ($Context.root_owned) { $failureState.root_deletes++; $Context.root_owned = $false } }
            'local.cleanup.media' { if ($Context.media_owned) { $failureState.media_deletes++; $Context.media_owned = $false } }
        }
    }
    $failed = Invoke-ActionSequence $actions $failureExecutor
    $expectedFailureLabels = @(
        'media.generate_once', 'remote.create_root', 'remote.transfer.scp', 'remote.sha_verify',
        'remote.release_dir', 'remote.extract', 'remote.env_install', 'remote.provider_install',
        'bootstrap.prepare', 'finally.cleanup.database', 'finally.cleanup.root', 'local.cleanup.media'
    )
    $failedLabels = @($failed.events | ForEach-Object { $_.label })
    if ($failed.primary_code -ne 'MOCK_BOOTSTRAP_STAGE' -or ($failedLabels -join '|') -ne ($expectedFailureLabels -join '|') -or $failed.completed_events -contains 'bootstrap.prepare' -or $failed.unknown_events -notcontains 'bootstrap.prepare' -or $failed.network_actions -le 0 -or $failed.external_writes -le 0 -or $failureState.database_drops -ne 0 -or $failureState.root_deletes -ne 1 -or $failureState.media_deletes -ne 1 -or $failureState.calls -ne $expectedFailureLabels.Count) {
        Fail 'SELF_TEST_PREPARE_FAILURE_CLEANUP_INVALID'
    }

    $preExistingMediaState = @{ media_deletes = 0 }
    $preExistingMediaExecutor = {
        param($Action, $Context)
        switch ($Action.label) {
            'media.generate_once' { Fail 'MEDIA_DIRECTORY_EXISTS' }
            'local.cleanup.media' { if ($Context.media_owned) { $preExistingMediaState.media_deletes++ } }
        }
    }
    $preExistingMedia = Invoke-ActionSequence $actions $preExistingMediaExecutor
    if ($preExistingMedia.primary_code -ne 'MEDIA_DIRECTORY_EXISTS' -or $preExistingMedia.network_actions -ne 0 -or $preExistingMediaState.media_deletes -ne 0 -or $preExistingMedia.context.media_owned) {
        Fail 'SELF_TEST_PREEXISTING_MEDIA_DELETED'
    }

    $preExistingRootState = @{ root_deletes = 0; media_deletes = 0 }
    $preExistingRootExecutor = {
        param($Action, $Context)
        switch ($Action.label) {
            'media.generate_once' { $Context.media_owned = $true }
            'remote.create_root' { Fail 'ROOT_DIRECTORY_EXISTS' }
            'finally.cleanup.root' { if ($Context.root_owned) { $preExistingRootState.root_deletes++ } }
            'local.cleanup.media' { if ($Context.media_owned) { $preExistingRootState.media_deletes++; $Context.media_owned = $false } }
        }
    }
    $preExistingRoot = Invoke-ActionSequence $actions $preExistingRootExecutor
    if ($preExistingRoot.primary_code -ne 'ROOT_DIRECTORY_EXISTS' -or $preExistingRootState.root_deletes -ne 0 -or $preExistingRootState.media_deletes -ne 1 -or $preExistingRoot.context.root_owned) {
        Fail 'SELF_TEST_PREEXISTING_ROOT_DELETED'
    }

    $transferFailureState = @{ root_deletes = 0; media_deletes = 0 }
    $transferFailureExecutor = {
        param($Action, $Context)
        switch ($Action.label) {
            'media.generate_once' { $Context.media_owned = $true }
            'remote.create_root' { $Context.root_owned = $true }
            'remote.transfer.scp' { Fail 'TRANSFER_STAGE_FAILED' }
            'finally.cleanup.root' { if ($Context.root_owned) { $transferFailureState.root_deletes++; $Context.root_owned = $false } }
            'local.cleanup.media' { if ($Context.media_owned) { $transferFailureState.media_deletes++; $Context.media_owned = $false } }
        }
    }
    $transferFailed = Invoke-ActionSequence $actions $transferFailureExecutor
    if ($transferFailed.primary_code -ne 'TRANSFER_STAGE_FAILED' -or $transferFailed.network_actions -le 0 -or $transferFailed.external_writes -le 0 -or $transferFailed.unknown_events -notcontains 'remote.transfer.scp' -or $transferFailureState.root_deletes -ne 1 -or $transferFailureState.media_deletes -ne 1) {
        Fail 'SELF_TEST_TRANSFER_FAILURE_EVIDENCE_INVALID'
    }

    $businessFailureState = @{ database_drops = 0; cleanup_errors = 0 }
    $businessFailureExecutor = {
        param($Action, $Context)
        switch ($Action.label) {
            'media.generate_once' { $Context.media_owned = $true }
            'remote.create_root' { $Context.root_owned = $true }
            'bootstrap.prepare' { $Context.database_owned = $true }
            'business.run' { Fail 'BUSINESS_COMPLETION_NOT_CONFIRMED' }
            'finally.cleanup.database' { if ($Context.database_owned) { $businessFailureState.database_drops++; Fail 'MOCK_CLEANUP_FAILURE' } }
        }
    }
    $businessFailed = Invoke-ActionSequence $actions $businessFailureExecutor
    if ($businessFailed.primary_code -ne 'BUSINESS_COMPLETION_NOT_CONFIRMED' -or $businessFailed.completed_events -contains 'business.run' -or $businessFailed.unknown_events -notcontains 'business.run' -or $businessFailed.cleanup_errors.Count -ne 1 -or $businessFailureState.database_drops -ne 1) {
        Fail 'SELF_TEST_BUSINESS_FAILURE_CLEANUP_INVALID'
    }

    return [ordered]@{
        outcome = 'passed'
        cases = @(
            'run_id_derivation', 'invalid_run_id', 'child_bootstrap_error_passthrough', 'child_business_error_passthrough', 'child_business_create_stage_codes',
            'child_error_fallbacks', 'single_media_generation', 'full_execute_sequence',
            'same_run_identity', 'single_create_rec_task', 'unknown_same_task_id', 'no_fake_cleanup_actions',
            'identity_group_plan', 'precreate_diagnostic_mode', 'mock_no_real_external_calls', 'preexisting_media_not_deleted', 'preexisting_root_not_deleted',
            'transfer_failure_reports_external_actions', 'prepare_failure_does_not_drop_database',
            'prepared_database_is_dropped', 'business_blocked_not_completed', 'cleanup_error_preserves_primary', 'reconciliation_preserves_remote_facts'
        )
    }
}

function New-RedactedPlan(
    [object]$Identity,
    [object]$Inputs,
    [object]$Archive,
    [object]$Bootstrap,
    [object]$Business,
    [bool]$PreCreateDiagnostic,
    [object]$Source,
    [object]$SecretSchema,
    [object]$Ssh,
    [object[]]$Actions
) {
    return [ordered]@{
        schema = 'qimao.tencent-asr.single-entry.execute/v4'
        command = if ($PreCreateDiagnostic) { 'PreCreateDiagnostic' } else { 'Execute' }
        run_id = $Identity.run_id
        remote = [ordered]@{
            root = $Identity.remote_root
            env_dir = $Identity.env_dir
            database = $Identity.database
            bootstrap_user = 'qimao-deploy'
            bootstrap_provider_owner = 'qimao-deploy'
            bootstrap_provider_group = 'qimao'
            business_user = 'qimao'
            business_group = 'qimao'
            env_group = 'qimao'
            provider_group = 'qimao'
            database_env_group = 'qimao'
        }
        inputs = [ordered]@{
            archive = [ordered]@{ name = $Archive.name; bytes = $Archive.bytes; sha256 = $Archive.sha256; expected_sha256 = $Archive.expected_sha256 }
            harness = [ordered]@{
                bootstrap = $Bootstrap.Name
                business = $Business.Name
                formal_extension = '.mjs'
            }
            source = [ordered]@{
                name = $Source.Name
                bytes = $Source.Length
                validated = $true
            }
            secret_csv = $SecretSchema
        }
        media = [ordered]@{
            directory = $Inputs.media_directory
            filename = $Inputs.media_filename
            recipe = 'source 5s..20s; H.264+AAC; metadata cleared; 15s target'
            generate_once = $true
        }
        transport = $Ssh
        execution = [ordered]@{
            action_sequence = @($Actions | ForEach-Object { $_.label })
            mode = if ($PreCreateDiagnostic) { 'precreate_diagnostic' } else { 'execute' }
            parameter_arrays_only = $true
            config_alias_only = $true
            provider = 'secret-in-memory-to-stdin; bootstrap derives env/provider.env'
            plan_hash_required = $true
            ownership = [ordered]@{
                cleanup_basis = 'owned_only'
                media_owned_after = 'New-Item succeeded'
                root_owned_after = 'mkdir succeeded'
                database_owned_after = 'bootstrap JSON outcome=prepared'
            }
            business_finally = 'formal business harness owns COS and process cleanup'
            precreate_stop = if ($PreCreateDiagnostic) { 'before AsrWorker.runOnce()' } else { $null }
            failure_report = 'completed_events plus unknown_events plus primary_stage_code'
        }
        sequence = @('prepare', 'business', 'cleanup')
        external_policy = [ordered]@{
            create_rec_task_maximum = if ($PreCreateDiagnostic) { 0 } else { 1 }
            tencent_writes_maximum = if ($PreCreateDiagnostic) { 0 } else { $null }
            unknown = 'same_task_id_only'
        }
        forbidden_in_preflight = @('remote command execution', 'file transfer', 'media generation', 'provider installation', 'database creation', 'external writes')
        immutable = $true
    }
}

function Get-ValidatedPlanResult {
    $defaults = Get-InputDefaults
    $identity = Get-DerivedRunIdentity $RunId
    $archivePathValue = Resolve-InputPath $ArchivePath $defaults.archive_path
    $bootstrapPathValue = Resolve-InputPath $BootstrapPath $defaults.bootstrap_path
    $businessPathValue = Resolve-InputPath $BusinessPath $defaults.business_path
    $sourcePathValue = Resolve-InputPath $SourcePath $defaults.source_path
    $secretPathValue = Resolve-InputPath $SecretCsvPath $defaults.secret_csv_path

    $archive = Get-ArchiveEvidence $archivePathValue $ExpectedArchiveSha256 $defaults.archive_path
    $bootstrap = Get-RequiredFile $bootstrapPathValue 'BOOTSTRAP_MISSING' $true
    $business = Get-RequiredFile $businessPathValue 'BUSINESS_MISSING' $true
    $source = Get-RequiredFile $sourcePathValue 'SOURCE_MISSING'
    $secretSchema = Get-SecretSchemaEvidence $secretPathValue
    $sshEvidence = Get-SshConfigEvidence $defaults.ssh_config_path
    $selfTest = Invoke-SelfTest
    $actions = @(Get-ExecutionActions $identity $defaults $archive $bootstrap $business ([bool]$PreCreateDiagnostic))
    $plan = New-RedactedPlan $identity $defaults $archive $bootstrap $business ([bool]$PreCreateDiagnostic) $source $secretSchema $sshEvidence $actions
    $planJson = $plan | ConvertTo-Json -Depth 14 -Compress
    return [ordered]@{
        artifact = 'qimao.tencent-asr.single-entry.preflight'
        identity = $identity
        defaults = $defaults
        archive = $archive
        bootstrap = $bootstrap
        business = $business
        source = $source
        secret_csv_path = $secretPathValue
        ssh_config_path = $defaults.ssh_config_path
        self_test = $selfTest
        plan_sha256 = Get-TextSha256 $planJson
        plan = $plan
        actions = $actions
    }
}

function Invoke-Preflight {
    if (-not $Preflight -or $Execute) {
        Fail 'PREFLIGHT_MODE_INVALID'
    }
    $validated = Get-ValidatedPlanResult
    return [ordered]@{
        artifact = $validated.artifact
        outcome = 'passed'
        network_actions = 0
        external_writes = 0
        self_test = $validated.self_test
        plan_sha256 = $validated.plan_sha256
        plan = $validated.plan
    }
}

function Invoke-MediaGeneration([object]$Context) {
    if ($Context.media_owned) {
        Fail 'MEDIA_GENERATION_DUPLICATE'
    }
    $directory = $Context.defaults.media_directory
    if (Test-Path -LiteralPath $directory) {
        Fail 'MEDIA_DIRECTORY_EXISTS'
    }
    try {
        [void](New-Item -ItemType Directory -Path $directory -Force:$false)
        $Context.media_owned = $true
        $mediaPath = Join-Path $directory $Context.defaults.media_filename
        $ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
        $ffmpegArguments = @(
            '-hide_banner', '-loglevel', 'error', '-y', '-ss', '5', '-i', $Context.source.FullName,
            '-t', '15', '-map', '0:v:0', '-map', '0:a:0', '-vf', 'scale=540:960,format=yuv420p',
            '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '320k', '-maxrate', '320k', '-bufsize', '640k',
            '-c:a', 'aac', '-b:a', '32k', '-ar', '16000', '-ac', '1', '-map_metadata', '-1', '-map_chapters', '-1',
            '-movflags', '+faststart', $mediaPath
        )
        [void](Invoke-ProcessArguments -FilePath $ffmpeg -Arguments $ffmpegArguments -Label 'media-generate' -FailureCode 'MEDIA_GENERATION_FAILED')
        $ffprobe = (Get-Command ffprobe -ErrorAction Stop).Source
        $probeArguments = @('-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name', '-of', 'json', $mediaPath)
        $probe = Invoke-ProcessArguments -FilePath $ffprobe -Arguments $probeArguments -Label 'media-verify' -FailureCode 'MEDIA_VERIFY_FAILED'
        if ($probe -notmatch 'video' -or $probe -notmatch 'audio' -or $probe -notmatch 'h264' -or $probe -notmatch 'aac') {
            Fail 'MEDIA_VERIFY_FAILED'
        }
        $item = Get-RequiredFile $mediaPath 'MEDIA_GENERATION_FAILED'
        $sha = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
        return [ordered]@{ path = $item.FullName; bytes = $item.Length; sha256 = $sha }
    } catch [RunnerFailure] {
        throw
    } catch {
        Fail 'MEDIA_GENERATION_FAILED'
    }
}

function Convert-StageJson([string]$Text, [string]$FailureCode) {
    if ([string]::IsNullOrWhiteSpace($Text)) {
        Fail $FailureCode
    }
    try {
        $value = $Text | ConvertFrom-Json -ErrorAction Stop
        if ($null -eq $value) {
            Fail $FailureCode
        }
        return $value
    } catch {
        Fail $FailureCode
    }
}

function Convert-BusinessStageJson([string]$Text, [string]$ExpectedOutcome, [string]$FailureCode = 'BUSINESS_OUTPUT_INVALID') {
    if ([string]::IsNullOrWhiteSpace($Text) -or [string]::IsNullOrWhiteSpace($ExpectedOutcome)) {
        Fail $FailureCode
    }
    $matches = @()
    foreach ($rawLine in ($Text -split "`r?`n")) {
        $line = $rawLine.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        try { $value = $line | ConvertFrom-Json -NoEnumerate -ErrorAction Stop } catch { Fail $FailureCode }
        if ($null -eq $value -or $value -is [Array] -or $value -is [string] -or $value -is [ValueType]) {
            Fail $FailureCode
        }
        $component = if ($value.PSObject.Properties.Name -contains 'component') { [string]$value.component } else { '' }
        if ($component -ne 'business') { continue }
        if ($value.PSObject.Properties.Name -notcontains 'outcome' -or [string]$value.outcome -ne $ExpectedOutcome) {
            Fail $FailureCode
        }
        $matches += $value
    }
    if ($matches.Count -ne 1) { Fail $FailureCode }
    return $matches[0]
}

function Get-ProviderContent([string]$Path) {
    try {
        $rows = @(Import-Csv -LiteralPath $Path -ErrorAction Stop)
    } catch {
        Fail 'PROVIDER_SOURCE_INVALID'
    }
    $propertyNames = if ($rows.Count -eq 1) { @($rows[0].PSObject.Properties.Name) -join ',' } else { '' }
    if ($rows.Count -ne 1 -or $propertyNames -ne 'SecretId,SecretKey') {
        Fail 'PROVIDER_SOURCE_INVALID'
    }
    $secretId = [string]$rows[0].SecretId
    $secretKey = [string]$rows[0].SecretKey
    if ([string]::IsNullOrWhiteSpace($secretId) -or [string]::IsNullOrWhiteSpace($secretKey)) {
        Fail 'PROVIDER_SOURCE_INVALID'
    }
    return "QIMAO_TENCENT_ASR_ENABLED=true`nQIMAO_TENCENT_ASR_REGION=ap-shanghai`nQIMAO_TENCENT_ASR_SECRET_ID=$secretId`nQIMAO_TENCENT_ASR_SECRET_KEY=$secretKey`nQIMAO_TENCENT_ASR_OBJECT_URL_TTL_SECONDS=600`nQIMAO_TENCENT_ASR_PRICE_CNY_PER_HOUR=1.75`n"
}

function Invoke-RealAction([object]$Action, [object]$Context) {
    $root = $Context.identity.remote_root
    $remoteArchive = Join-RemotePath $root $Context.archive.name
    $remoteBootstrap = Join-RemotePath $root $Context.bootstrap.Name
    $remoteBusiness = Join-RemotePath $root $Context.business.Name
    $remoteMedia = Join-RemotePath $root $Context.defaults.media_filename
    $remoteProvider = Join-RemotePath $root 'provider.tmp'
    $release = Join-RemotePath $root 'release'

    switch ($Action.label) {
        'media.generate_once' {
            $Context.media = Invoke-MediaGeneration $Context
            return
        }
        'remote.create_root' {
            [void](Invoke-SshArguments $Context.ssh_config_path @('mkdir', '-m', '700', $root) $null 'ROOT_CREATE_FAILED')
            $Context.root_owned = $true
            return
        }
        'remote.transfer.scp' {
            [void](Invoke-ScpArguments $Context.ssh_config_path @($Context.archive.path, $Context.bootstrap.FullName, $Context.business.FullName, $Context.media.path) $root 'TRANSFER_FAILED')
            return
        }
        'remote.sha_verify' {
            $shaOutput = Invoke-SshArguments $Context.ssh_config_path @('sha256sum', $remoteArchive, $remoteMedia) $null 'REMOTE_SHA_VERIFY_FAILED'
            if ($shaOutput -notmatch [regex]::Escape($Context.archive.sha256) -or $shaOutput -notmatch [regex]::Escape($Context.media.sha256)) {
                Fail 'REMOTE_SHA_MISMATCH'
            }
            return
        }
        'remote.release_dir' {
            [void](Invoke-SshArguments $Context.ssh_config_path @('mkdir', '-m', '700', $release) $null 'RELEASE_DIR_FAILED')
            return
        }
        'remote.extract' {
            [void](Invoke-SshArguments $Context.ssh_config_path @('tar', '-xzf', $remoteArchive, '-C', $release) $null 'RELEASE_EXTRACT_FAILED')
            return
        }
        'remote.env_install' {
            [void](Invoke-SshArguments $Context.ssh_config_path @('sudo', '-n', 'install', '-d', '-o', 'root', '-g', 'qimao', '-m', '0750', $Context.identity.env_dir) $null 'ENV_INSTALL_FAILED')
            [void](Invoke-SshArguments $Context.ssh_config_path @('sudo', '-n', 'install', '-o', 'root', '-g', 'qimao', '-m', '0640', '/etc/qimao-terms-cloud/backend.env', (Join-RemotePath $Context.identity.env_dir 'backend.env')) $null 'ENV_INSTALL_FAILED')
            [void](Invoke-SshArguments $Context.ssh_config_path @('sudo', '-n', 'install', '-o', 'root', '-g', 'qimao', '-m', '0640', '/etc/qimao-terms-cloud/object-storage.env', (Join-RemotePath $Context.identity.env_dir 'object-storage.env')) $null 'ENV_INSTALL_FAILED')
            return
        }
        'remote.provider_install' {
            $providerContent = Get-ProviderContent $Context.secret_csv_path
            [void](Invoke-SshArguments $Context.ssh_config_path @('sudo', '-n', 'install', '-o', 'qimao-deploy', '-g', 'qimao', '-m', '0600', '/dev/stdin', $remoteProvider) $providerContent 'PROVIDER_INSTALL_FAILED')
            return
        }
        'bootstrap.prepare' {
            $prepareArguments = @(
                '/usr/local/bin/node', $remoteBootstrap, '--prepare', '--root', $root, '--archive', $remoteArchive,
                '--release', $release, '--env-dir', $Context.identity.env_dir, '--media', $remoteMedia,
                '--business', $remoteBusiness, '--provider-source', $remoteProvider, '--db-name', $Context.identity.database,
                '--archive-sha', $Context.archive.sha256, '--media-sha', $Context.media.sha256, '--media-bytes', [string]$Context.media.bytes
            )
            $prepareOutput = Invoke-SshArguments $Context.ssh_config_path $prepareArguments $null 'BOOTSTRAP_PREPARE_FAILED' 'bootstrap'
            $prepareResult = Convert-StageJson $prepareOutput 'BOOTSTRAP_OUTPUT_INVALID'
            if ($prepareResult.outcome -ne 'prepared') {
                Fail 'BOOTSTRAP_PREPARE_NOT_CONFIRMED'
            }
            $Context.database_owned = $true
            return
        }
        'business.run' {
            $businessArguments = @('sudo', '-n', '-u', 'qimao', '-g', 'qimao', '--', '/usr/local/bin/node', $remoteBusiness)
            if ($Context.precreate_diagnostic) {
                $businessArguments += '--precreate-diagnostic'
            } else {
                $businessArguments += '--run'
            }
            $businessArguments += @(
                '--root', $root, '--release', $release, '--env-dir', $Context.identity.env_dir, '--business', $remoteBusiness,
                '--media', $remoteMedia, '--db-name', $Context.identity.database, '--run-id', $Context.identity.run_id,
                '--media-sha', $Context.media.sha256, '--media-bytes', [string]$Context.media.bytes
            )
            $expectedBusinessOutcome = if ($Context.precreate_diagnostic) { 'precreate_ready' } else { 'completed' }
            try {
                $businessOutput = Invoke-SshArguments $Context.ssh_config_path $businessArguments $null 'BUSINESS_RUN_FAILED' 'business'
            } catch {
                $childCode = if ($_.Exception -is [RunnerFailure]) { $_.Exception.Code } else { $null }
                if ($childCode -in @('ASR_TASK_ACCEPTED', 'ASR_CREATE_UNKNOWN')) {
                    $Context.reconciliation_preserve = $true
                    $Context.reconciliation_code = $childCode
                }
                throw
            }
            $businessResult = Convert-BusinessStageJson $businessOutput $expectedBusinessOutcome
            if ($Context.precreate_diagnostic -and ($businessResult.evidence.asrWorkerRunOnce -ne $false -or $businessResult.evidence.externalCreateCount -ne 0 -or $businessResult.evidence.tencentWrites -ne 0)) {
                Fail 'PRECREATE_RESULT_INVALID'
            }
            $Context.business_result = $businessResult
            return
        }
        'finally.cleanup.database' {
            if ($Context.database_owned -and -not $Context.reconciliation_preserve) {
                [void](Invoke-SshArguments $Context.ssh_config_path @('/usr/local/bin/node', $remoteBootstrap, '--drop-db', '--db-name', $Context.identity.database) $null 'DATABASE_DROP_FAILED')
                $Context.database_owned = $false
            }
            return
        }
        'finally.cleanup.root' {
            if ($Context.root_owned -and -not $Context.reconciliation_preserve) {
                [void](Invoke-SshArguments $Context.ssh_config_path @('sudo', '-n', 'rm', '-rf', '--', $root) $null 'ROOT_CLEANUP_FAILED')
                $Context.root_owned = $false
            }
            return
        }
        'local.cleanup.media' {
            if ($Context.media_owned -and (Test-Path -LiteralPath $Context.defaults.media_directory)) {
                Remove-Item -LiteralPath $Context.defaults.media_directory -Recurse -Force
                $Context.media_owned = $false
            }
            return
        }
        default { Fail 'EXECUTE_ACTION_UNKNOWN' }
    }
}

function Invoke-Execute {
    if (-not $Execute -or $Preflight) {
        Fail 'EXECUTE_MODE_INVALID'
    }
    if ([string]::IsNullOrWhiteSpace($PlanSha256) -or $PlanSha256 -notmatch '^[0-9a-fA-F]{64}$') {
        Fail 'PLAN_HASH_INVALID'
    }
    $validated = Get-ValidatedPlanResult
    if ($validated.plan_sha256 -ne $PlanSha256.ToLowerInvariant()) {
        Fail 'PLAN_HASH_MISMATCH'
    }
    $context = [ordered]@{
        identity = $validated.identity
        defaults = $validated.defaults
        archive = $validated.archive
        bootstrap = $validated.bootstrap
        business = $validated.business
        source = $validated.source
        secret_csv_path = $validated.secret_csv_path
        ssh_config_path = $validated.ssh_config_path
        precreate_diagnostic = [bool]$PreCreateDiagnostic
        media = $null
        media_owned = $false
        root_owned = $false
        database_owned = $false
        business_result = $null
        reconciliation_preserve = $false
        reconciliation_code = $null
    }
    $executor = { param($Action, $State) Invoke-RealAction $Action $context }
    $execution = Invoke-ActionSequence $validated.actions $executor $context
    $script:ExecutionReport = [ordered]@{
        events = $execution.events
        completed_events = $execution.completed_events
        unknown_events = $execution.unknown_events
        network_actions = $execution.network_actions
        external_writes = $execution.external_writes
        cleanup_errors = $execution.cleanup_errors
        tencent_writes = if ($PreCreateDiagnostic) { 0 } else { $null }
        create_rec_task_actual = if ($PreCreateDiagnostic) { 0 } else { $null }
        reconciliation_preserved = [bool]$execution.context.reconciliation_preserve
        reconciliation_run_id = if ($execution.context.reconciliation_preserve) { $execution.context.identity.run_id } else { $null }
    }
    if ($null -ne $execution.primary_code) {
        Fail $execution.primary_code
    }
    if ($execution.cleanup_errors.Count -gt 0) {
        Fail 'CLEANUP_FAILED'
    }
    $businessResult = $execution.context.business_result
    return [ordered]@{
        artifact = 'qimao.tencent-asr.single-entry.execute'
        outcome = if ($PreCreateDiagnostic) { 'precreate_ready' } else { 'executed' }
        business_outcome = $businessResult.outcome
        network_actions = $execution.network_actions
        external_writes = $execution.external_writes
        tencent_writes = if ($PreCreateDiagnostic) { 0 } else { $null }
        create_rec_task_actual = if ($PreCreateDiagnostic) { 0 } else { $null }
        plan_sha256 = $validated.plan_sha256
        events = $execution.events
        completed_events = $execution.completed_events
        unknown_events = $execution.unknown_events
        external_create_rec_task_maximum = 1
        unknown_result_policy = 'same_task_id_only'
        reconciliation_preserved = [bool]$execution.context.reconciliation_preserve
        reconciliation_run_id = if ($execution.context.reconciliation_preserve) { $execution.context.identity.run_id } else { $null }
    }
}

$script:ExecutionReport = $null

try {
    if ($SelfTest) {
        if ($Preflight -or $Execute -or $PreCreateDiagnostic) {
            Fail 'MODE_REQUIRED'
        }
        Invoke-SelfTest | ConvertTo-Json -Depth 12 -Compress | Write-Output
        exit 0
    }
    if (($Preflight -and $Execute) -or (-not $Preflight -and -not $Execute) -or ($PreCreateDiagnostic -and (-not $Preflight -and -not $Execute))) {
        Fail 'MODE_REQUIRED'
    }
    if ($Preflight) {
        Invoke-Preflight | ConvertTo-Json -Depth 16 -Compress | Write-Output
    } else {
        Invoke-Execute | ConvertTo-Json -Depth 16 -Compress | Write-Output
    }
} catch {
    $code = if ($_.Exception -is [RunnerFailure]) { $_.Exception.Code } else { 'UNEXPECTED_FAILURE' }
    $report = if ($null -ne $script:ExecutionReport) { $script:ExecutionReport } else { [ordered]@{ events = @(); completed_events = @(); unknown_events = @(); network_actions = 0; external_writes = 0; cleanup_errors = @(); reconciliation_preserved = $false; reconciliation_run_id = $null } }
    [Console]::Error.WriteLine((([ordered]@{ artifact = 'qimao.tencent-asr.single-entry'; outcome = 'blocked'; code = $code; stage_code = $code; network_actions = $report.network_actions; external_writes = $report.external_writes; tencent_writes = if ($PreCreateDiagnostic) { 0 } else { $null }; create_rec_task_actual = if ($PreCreateDiagnostic) { 0 } else { $null }; events = $report.events; completed_events = $report.completed_events; unknown_events = $report.unknown_events; cleanup_errors = $report.cleanup_errors; reconciliation_preserved = $report.reconciliation_preserved; reconciliation_run_id = $report.reconciliation_run_id }) | ConvertTo-Json -Depth 12 -Compress))
    exit 1
}
