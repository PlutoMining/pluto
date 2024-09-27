interface LogsIconProps {
  color: string;
}

export const LogsIcon = ({ color = "white" }: LogsIconProps) => {
  return (
    <svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
      <path
        clipRule="evenodd"
        d="M0.75 2.24799C0.75 1.41956 1.42157 0.747986 2.25 0.747986H21.75C22.5784 0.747986 23.25 1.41956 23.25 2.24799V21.748C23.25 22.5764 22.5784 23.248 21.75 23.248H2.25C1.42157 23.248 0.75 22.5764 0.75 21.748V2.24799Z"
        fillRule="evenodd"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M9.75 5.24799H18.75"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M5.25 14.248H18.75"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M5.25 9.74799H18.75"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M5.25 18.748H12.75"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
};
