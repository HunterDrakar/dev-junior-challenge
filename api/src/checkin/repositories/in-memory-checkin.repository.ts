import { Checkin, NovoCheckin } from '../checkin.entity';
import { diaLocal } from '../dia';
import { CheckinDuplicadoError, CheckinRepository } from './checkin.repository';

/** Fila em memória: some quando a API reinicia. */
export class InMemoryCheckinRepository extends CheckinRepository {
  readonly armazenamento = 'memoria';
  private readonly checkins: Checkin[] = [];
  private proximoId = 1;

  salvar(novo: NovoCheckin): Promise<Checkin> {
    const doDia = this.doDia(diaLocal(novo.chegada));
    if (doDia.some((c) => c.cpf === novo.cpf)) {
      return Promise.reject(new CheckinDuplicadoError());
    }

    const checkin: Checkin = {
      id: this.proximoId++,
      ...novo,
      senha: doDia.length + 1,
      status: 'aguardando',
      chamadoEm: null,
    };
    this.checkins.push(checkin);
    return Promise.resolve({ ...checkin });
  }

  verificarConexao(): Promise<void> {
    return Promise.resolve();
  }

  listarDoDia(dia: string): Promise<Checkin[]> {
    // Cópias: quem recebe a lista não vê (nem altera) o que muda depois aqui.
    return Promise.resolve(this.doDia(dia).map((c) => ({ ...c })));
  }

  chamarProximo(dia: string, chamadoEm: Date): Promise<Checkin | null> {
    const proximo = this.doDia(dia).find((c) => c.status === 'aguardando');
    if (!proximo) {
      return Promise.resolve(null);
    }
    proximo.status = 'chamado';
    proximo.chamadoEm = chamadoEm;
    return Promise.resolve({ ...proximo });
  }

  private doDia(dia: string): Checkin[] {
    return this.checkins
      .filter((c) => diaLocal(c.chegada) === dia)
      .sort((a, b) => a.senha - b.senha);
  }
}
