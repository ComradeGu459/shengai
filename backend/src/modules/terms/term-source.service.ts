import { createHash } from 'node:crypto';

import type { TermSourceState } from '@qimao-terms-cloud/contracts';

import type { UploadStorage } from '../uploads/upload-storage.js';
import { parseSrt, type ParsedTermCue } from './srt-parser.js';
import { TermDomainError, termConflict, termInvalid, type TermErrorCode } from './term-errors.js';
import { TermSourceRepository, type CompanySrtAssetSource } from './term-source.repository.js';

export interface ReadyTermSource {
  state: TermSourceState & { status: 'ready'; sourceSrtSetDigest: string; manifestId: string };
  assets: CompanySrtAssetSource[];
  cues: ParsedTermCue[];
}

const digestSource = (assets: CompanySrtAssetSource[]) => createHash('sha256')
  .update(assets.map((asset) => [
    asset.episodeNumber,
    asset.assetId,
    asset.checksumAlgorithm,
    asset.checksumValue,
  ].join(':')).join('\n'))
  .digest('hex');

export class TermSourceService {
  constructor(
    private readonly repository: TermSourceRepository,
    private readonly storage: UploadStorage,
  ) {}

  async inspect(projectId: string): Promise<{ state: TermSourceState; ready: ReadyTermSource | null }> {
    const source = await this.repository.latestCompanySrtAssets(projectId);
    const manifestId = source.manifestId ?? null;
    const expectedAssetCount = source.expectedAssetCount ?? 0;
    if (source.lifecycleStatus !== 'active') {
      return {
        state: {
          status: 'blocked', manifestId, sourceSrtSetDigest: null, episodeCount: 0, assetCount: 0,
          issueCode: 'TERM_SOURCE_NOT_READY', issueDetail: '项目不在可处理状态。',
        },
        ready: null,
      };
    }
    if (!manifestId || expectedAssetCount === 0) {
      return {
        state: {
          status: 'blocked', manifestId, sourceSrtSetDigest: null, episodeCount: 0, assetCount: 0,
          issueCode: 'TERM_SOURCE_NOT_READY', issueDetail: '最新已确认素材清单没有公司 SRT。',
        },
        ready: null,
      };
    }
    if (source.assets.length !== expectedAssetCount) {
      return {
        state: {
          status: 'blocked', manifestId, sourceSrtSetDigest: null,
          episodeCount: expectedAssetCount, assetCount: source.assets.length,
          issueCode: 'TERM_SOURCE_NOT_READY', issueDetail: '最新清单中的公司 SRT 尚未全部绑定已校验 Asset。',
        },
        ready: null,
      };
    }
    const digest = digestSource(source.assets);
    const cues: ParsedTermCue[] = [];
    try {
      for (const asset of source.assets) {
        if (asset.checksumAlgorithm !== 'sha256') {
          throw termInvalid('TERM_SOURCE_CONTENT_INVALID', `${asset.fileName} 使用了不支持的内容校验算法。`);
        }
        const bytes = await this.storage.readObject(asset.objectKey);
        if (!bytes) throw termInvalid('TERM_SOURCE_OBJECT_MISSING', `${asset.fileName} 的已校验对象不存在。`, 'reupload_source_srt');
        const checksum = createHash('sha256').update(bytes).digest('hex');
        if (bytes.byteLength !== asset.sizeBytes || checksum !== asset.checksumValue) {
          throw termInvalid('TERM_SOURCE_CONTENT_INVALID', `${asset.fileName} 的对象内容与 Asset 校验记录不一致。`, 'reupload_source_srt');
        }
        cues.push(...parseSrt({ bytes, ...asset }));
      }
    } catch (error) {
      if (error instanceof TermDomainError) {
        const domain = error;
        return {
          state: {
            status: 'invalid', manifestId, sourceSrtSetDigest: digest,
            episodeCount: expectedAssetCount, assetCount: source.assets.length,
            issueCode: domain.code, issueDetail: domain.message,
          },
          ready: null,
        };
      }
      throw error;
    }
    const state: ReadyTermSource['state'] = {
      status: 'ready', manifestId, sourceSrtSetDigest: digest,
      episodeCount: new Set(source.assets.map((asset) => asset.episodeNumber)).size,
      assetCount: source.assets.length, issueCode: null, issueDetail: null,
    };
    return { state, ready: { state, assets: source.assets, cues } };
  }

  async requireReady(projectId: string, expectedDigest?: string) {
    const inspected = await this.inspect(projectId);
    if (!inspected.ready) {
      throw termInvalid(
        (inspected.state.issueCode ?? 'TERM_SOURCE_NOT_READY') as TermErrorCode,
        inspected.state.issueDetail ?? '公司 SRT 尚未就绪。',
      );
    }
    if (expectedDigest && inspected.ready.state.sourceSrtSetDigest !== expectedDigest) {
      throw termConflict('TERM_SOURCE_CHANGED', '公司 SRT 来源已经变化，请刷新后重新提取或建立新草稿。');
    }
    return inspected.ready;
  }
}
