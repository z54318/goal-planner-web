import { useState } from 'react'

type PasswordFieldProps = {
  label: string
  placeholder: string
  value: string
  name?: string
  onChange: (value: string) => void
}

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M2.2 12s3.6-6 9.8-6 9.8 6 9.8 6-3.6 6-9.8 6-9.8-6-9.8-6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="3.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.6 6.4A10.6 10.6 0 0 1 12 6c6.2 0 9.8 6 9.8 6a18.6 18.6 0 0 1-4 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.3 7.2A18.8 18.8 0 0 0 2.2 12s3.6 6 9.8 6c1.3 0 2.5-.2 3.6-.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 9.8a3.2 3.2 0 0 0 4.3 4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 带显示/隐藏切换的密码输入框，供登录和注册表单复用。
export function PasswordField({
  label,
  placeholder,
  value,
  name,
  onChange,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-password-field">
        <input
          name={name}
          type={isVisible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          className="password-toggle-button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? '隐藏密码' : '显示密码'}
          aria-pressed={isVisible}
        >
          <EyeIcon visible={isVisible} />
        </button>
      </div>
    </label>
  )
}
