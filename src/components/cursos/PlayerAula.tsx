import { useEffect, useRef } from 'react';
import type { Provedor } from '../../lib/cursos';

/**
 * Player da aula.
 *
 * Usa o domínio youtube-nocookie.com, o modo de privacidade do próprio
 * YouTube: nada de cookie de rastreamento na aluna enquanto ela não
 * aperta o play. rel=0 limita os vídeos sugeridos ao fim da aula aos do
 * próprio canal, em vez de qualquer coisa do YouTube.
 *
 * A API do player serve para duas coisas: começar de onde a aluna parou
 * e avisar quanto ela já assistiu, para o progresso.
 */

interface Props {
  provedor: Provedor;
  videoId: string;
  titulo: string;
  inicioSeg?: number;
  /** Chamado a cada ~10s tocando, e ao pausar. */
  onProgresso?: (posicaoSeg: number, duracaoSeg: number) => void;
  onTerminou?: () => void;
}

// Tipagem mínima da API do YouTube: só o que este componente usa.
interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let carregandoApi: Promise<YTNamespace> | null = null;

/** Carrega o script da API uma vez só, por mais players que abram. */
function carregarApiYoutube(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (carregandoApi) return carregandoApi;

  carregandoApi = new Promise((resolve, reject) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      carregandoApi = null;
      reject(new Error('Não carregou a API do YouTube'));
    };
    document.head.appendChild(script);
  });

  return carregandoApi;
}

const INTERVALO_MS = 10_000;

export default function PlayerAula({ provedor, videoId, titulo, inicioSeg = 0, onProgresso, onTerminou }: Props) {
  // O YouTube substitui o elemento que recebe por um iframe. Se fosse um
  // nó do React, a desmontagem tentaria remover algo que já não existe;
  // por isso o alvo é criado à mão dentro desta caixa, que o React só
  // desenha vazia.
  const caixa = useRef<HTMLDivElement>(null);

  // Os callbacks mudam a cada render da página; guardados em ref para o
  // player não ser destruído e recriado por causa disso.
  const aoProgredir = useRef(onProgresso);
  const aoTerminar = useRef(onTerminou);
  useEffect(() => {
    aoProgredir.current = onProgresso;
    aoTerminar.current = onTerminou;
  });

  useEffect(() => {
    const recipiente = caixa.current;
    if (provedor !== 'youtube' || !recipiente) return;

    const alvo = document.createElement('div');
    recipiente.appendChild(alvo);

    let player: YTPlayer | null = null;
    let relogio: ReturnType<typeof setInterval> | null = null;
    let desmontado = false;

    const informar = () => {
      if (!player) return;
      // Até o evento onReady os métodos do player não existem ainda; sair
      // da aula nesse intervalo não pode derrubar a página.
      try {
        const duracao = player.getDuration();
        if (duracao > 0) aoProgredir.current?.(Math.floor(player.getCurrentTime()), Math.floor(duracao));
      } catch {
        /* player ainda não pronto: não há posição a guardar */
      }
    };

    carregarApiYoutube()
      .then(YT => {
        if (desmontado) return;
        player = new YT.Player(alvo, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          playerVars: {
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            start: Math.max(0, Math.floor(inicioSeg)),
          },
          events: {
            onStateChange: (e: { data: number }) => {
              if (e.data === YT.PlayerState.PLAYING) {
                if (!relogio) relogio = setInterval(informar, INTERVALO_MS);
              } else {
                if (relogio) { clearInterval(relogio); relogio = null; }
                if (e.data === YT.PlayerState.PAUSED) informar();
                if (e.data === YT.PlayerState.ENDED) {
                  // Chegar ao fim é posição = duração: o progresso conclui
                  // a aula por esse caminho, que nunca desmarca.
                  try {
                    const fim = Math.floor(player?.getDuration() ?? 0);
                    if (fim > 0) aoProgredir.current?.(fim, fim);
                  } catch { /* player já desmontado */ }
                  aoTerminar.current?.();
                }
              }
            },
          },
        });
      })
      .catch(err => console.error(err));

    return () => {
      desmontado = true;
      // Guarda onde parou ao sair da aula no meio.
      informar();
      if (relogio) clearInterval(relogio);
      player?.destroy();
      recipiente.replaceChildren();
    };
    // inicioSeg fica de fora de propósito: mudar a posição salva não deve
    // reiniciar o vídeo que já está tocando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provedor, videoId]);

  if (provedor !== 'youtube') {
    return (
      <div className="aspect-video w-full rounded-2xl bg-netzach-deep border border-netzach-border flex items-center justify-center text-sm text-netzach-muted">
        Este vídeo ainda não pode ser exibido aqui.
      </div>
    );
  }

  return (
    <div
      ref={caixa}
      role="region"
      aria-label={`Vídeo da aula: ${titulo}`}
      className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-netzach-border shadow-2xl [&>*]:w-full [&>*]:h-full"
    />
  );
}
