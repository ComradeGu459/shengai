import type { SVGProps } from 'react';

const Icon = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const ProjectIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M4.5 6.5h5l1.7 2h8.3v9a2 2 0 0 1-2 2h-13v-13Z" />
    <path d="M4.5 9h15" />
  </Icon>
);

export const UploadIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 16V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M5 14.5v4a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-4" />
  </Icon>
);

export const RecycleIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M5 7h14" />
    <path d="M9 7V4.5h6V7M7 7l.8 12h8.4L17 7" />
    <path d="M10 10.5v5M14 10.5v5" />
  </Icon>
);

export const WaveformIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M4 12h2l1.5-5 3 10 3-12 3 14 1.5-7H20" />
  </Icon>
);

export const ChevronIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="m14.5 7-5 5 5 5" />
  </Icon>
);

export const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="10.8" cy="10.8" r="6.2" />
    <path d="m15.5 15.5 4 4" />
  </Icon>
);

export const PlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const RetryIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M19 8a7.5 7.5 0 1 0 1 7" />
    <path d="M19 3v5h-5" />
  </Icon>
);
