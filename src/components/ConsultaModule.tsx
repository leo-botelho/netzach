import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, RefreshCw, BookMarked, Check } from 'lucide-react';
import { usePlanCredit } from '../hooks/usePlanCredit';
import { useSaveToGrimorio } from '../hooks/useSaveToGrimorio';
import { useSacerdotisaStream } from '../hooks/useSacerdotisaStream';
import { markdownParaHtml } from '../utils/markdownSeguro';

/**
 * Tela de consulta à sacerdotisa.
 *
 * As páginas de banho, florais, lei da atração e relacionamento eram
 * cópias quase idênticas uma da outra: mesmos estados, mesmo leitor de
 * fluxo, mesmo cartão de limite, mesmo botão do grimório. Só mudavam o
 * título, as sugestões e o texto do campo.
 */

export interface ConsultaModuleProps {
  /** Chave do módulo, a mesma usada nos créditos e no servidor. */
  moduleKey: string;
  titulo: string;
  subtitulo: string;
  /** Pergunta acima das sugestões. */
  pergunta: string;
  /** Sugestões rápidas; escolher uma preenche o campo. */
  sugestoes: string[];
  /** Texto de exemplo dentro do campo livre. */
  placeholder: string;
  /** Texto do botão de envio. */
  acao?: string;
  /** Frase do cartão de limite atingido. */
  mensagemLimite: string;
}

export default function ConsultaModule({
  moduleKey,
  titulo,
  subtitulo,
  pergunta,
  sugestoes,
  placeholder,
  acao = 'Receber orientação',
  mensagemLimite,
}: ConsultaModuleProps) {
  const navigate = useNavigate();
  const [entrada, setEntrada] = useState('');
  const respostaRef = useRef<HTMLDivElement>(null);

  const credito = usePlanCredit(moduleKey);
  const { saved, erro: erroGrimorio, saveToGrimorio, reset } = useSaveToGrimorio(moduleKey);
  const { resposta, gerando, bloqueado, mensagemErro, consultar, limpar } =
    useSacerdotisaStream(moduleKey, () =>
      respostaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    );

  const enviar = async () => {
    reset();
    const deuCerto = await consultar(entrada);
    if (deuCerto) await credito.refresh();
  };

  const recomecar = () => { limpar(); setEntrada(''); reset(); };

  const semCredito = bloqueado || (!credito.loading && !credito.canUse);
  const restantes = credito.remaining;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar"
          className="text-netzach-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">{titulo}</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">{subtitulo}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5">
        <div>
          <p className="text-xs text-netzach-muted uppercase tracking-wider mb-3">{pergunta}</p>
          <div className="flex flex-wrap gap-2">
            {sugestoes.map(s => (
              <button key={s} onClick={() => setEntrada(s)}
                aria-pressed={entrada === s}
                className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                  entrada === s
                    ? 'border-netzach-gold bg-netzach-gold/10 text-white'
                    : 'border-netzach-border text-netzach-muted hover:text-white'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="consulta" className="block text-xs text-netzach-muted uppercase tracking-wider mb-2">
            Ou descreva com suas palavras
          </label>
          <textarea id="consulta" value={entrada} onChange={e => setEntrada(e.target.value)}
            placeholder={placeholder} rows={3} maxLength={2000}
            className="input-mystic resize-none" />
        </div>

        {semCredito ? (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 text-center space-y-3">
            <div className="text-3xl" aria-hidden="true">🌙</div>
            <p className="font-mystic text-netzach-gold">Suas consultas desta semana já foram usadas</p>
            <p className="text-sm text-netzach-muted">{mensagemLimite}</p>
            <button onClick={() => navigate('/assinar')}
              className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl hover:bg-white transition-colors">
              Ver planos
            </button>
          </div>
        ) : (
          <>
            <button onClick={enviar} disabled={!entrada.trim() || gerando}
              className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-4 rounded-2xl hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {gerando
                ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Consultando</>
                : <><Sparkles size={18} aria-hidden="true" /> {acao}</>}
            </button>

            {restantes !== null && restantes > 0 && !gerando && (
              <p className="text-center text-[11px] text-netzach-muted">
                {restantes === 1
                  ? 'Resta 1 consulta nesta semana'
                  : `Restam ${restantes} consultas nesta semana`}
              </p>
            )}
          </>
        )}

        {mensagemErro && (
          <p role="alert" className="text-sm text-netzach-rose text-center">{mensagemErro}</p>
        )}

        {resposta && (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-netzach-gold uppercase tracking-wider font-bold">
                ✦ Sua orientação sagrada
              </span>
              <button onClick={recomecar} aria-label="Nova consulta"
                className="text-netzach-muted hover:text-white transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>

            <div ref={respostaRef}
              className="text-sm text-netzach-text/90 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: markdownParaHtml(resposta) }} />

            {!gerando && (
              <div className="flex flex-col gap-1.5">
                <button onClick={() => saveToGrimorio(resposta, entrada)} disabled={saved}
                  className={`self-start flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    saved
                      ? 'border-netzach-gold/40 text-netzach-gold bg-netzach-gold/10 cursor-default'
                      : 'border-netzach-border text-netzach-muted hover:border-netzach-gold/50 hover:text-netzach-gold'
                  }`}>
                  {saved ? <Check size={11} /> : <BookMarked size={11} />}
                  {saved ? 'Salvo no Grimório' : 'Salvar no Grimório'}
                </button>
                {erroGrimorio && (
                  <span role="alert" className="text-[11px] text-netzach-rose">{erroGrimorio}</span>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
