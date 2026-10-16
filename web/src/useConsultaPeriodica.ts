import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Busca os dados ao abrir a tela e de novo a cada `intervaloMs`.
 * `buscar` precisa ser estável (uma função do módulo, não criada no render).
 */
export function useConsultaPeriodica<T>(buscar: () => Promise<T>, intervaloMs: number) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState(() => new Date());
  const ultimaConsulta = useRef(0);

  const recarregar = useCallback(async () => {
    // Só a consulta mais recente vale: uma resposta atrasada (ex.: a da
    // atualização automática que saiu antes de uma chamada) não sobrescreve a
    // tela com dados velhos.
    const consulta = ++ultimaConsulta.current;
    try {
      const resultado = await buscar();
      if (consulta !== ultimaConsulta.current) return;
      setDados(resultado);
      setErro(null);
    } catch (e) {
      if (consulta !== ultimaConsulta.current) return;
      setErro(e instanceof Error ? e.message : 'Erro inesperado.');
    }
    setAtualizadoEm(new Date());
  }, [buscar]);

  useEffect(() => {
    void recarregar();
    const intervalo = setInterval(recarregar, intervaloMs);
    return () => clearInterval(intervalo);
  }, [recarregar, intervaloMs]);

  return {
    dados,
    erro,
    carregando: dados === null && erro === null,
    atualizadoEm,
    recarregar,
  };
}
