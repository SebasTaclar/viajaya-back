interface PasswordSmsTemplateParams {
  name: string;
  password: string;
}

export const createPasswordSmsMessage = ({ name, password }: PasswordSmsTemplateParams): string => {
  return `Hola ${name}, tu nueva clave para el portal de Viaja Ya es: ${password}. No la compartas.`;
};
