type AppleButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function SignInWithAppleButton({ onClick, disabled }: AppleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-black px-4 text-[17px] font-[system-ui] font-medium text-white transition active:opacity-80 disabled:opacity-60"
    >
      <svg aria-hidden="true" viewBox="0 0 17 20" className="h-5 w-4">
        <path
          fill="currentColor"
          d="M13.6 10.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.2c.8-1.2 1.2-2.3 1.2-2.4-.1 0-2.5-1-2.5-3.8zM11.7 3.8c.6-.8 1.1-1.9.9-3-1 .1-2.1.6-2.8 1.4-.6.7-1.2 1.8-.9 2.9 1.1.1 2.1-.5 2.8-1.3z"
        />
      </svg>
      Sign in with Apple
    </button>
  );
}
