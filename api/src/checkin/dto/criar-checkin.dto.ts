import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CriarCheckinDto {
  // Aceita "111.111.111-11" ou "11111111111". O formato é conferido antes de
  // tirar a pontuação, para "1a1b1c..." não virar um CPF válido.
  @IsNotEmpty({ message: 'Informe o CPF.' })
  @IsString({ message: 'O CPF deve ser enviado como texto.' })
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, {
    message: 'O CPF deve ter 11 dígitos.',
  })
  cpf!: string;
}
