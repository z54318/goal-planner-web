import { PasswordInput } from '@mantine/core'

type PasswordFieldProps = {
  label: string
  placeholder: string
  value: string
  name?: string
  onChange: (value: string) => void
}

// 带显示/隐藏切换的密码输入框，供登录和注册表单复用。
export function PasswordField({
  label,
  placeholder,
  value,
  name,
  onChange,
}: PasswordFieldProps) {
  return (
    <PasswordInput
      name={name}
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      radius="md"
      size="md"
      required
    />
  )
}
