import { useState } from 'react';
import { Download, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Direitos da usuária sobre os próprios dados (§16 do documento, LGPD).
 *
 * O documento determina que ciclo, humor, saúde e emoção são dados
 * sensíveis e privados. Direito de acesso e de exclusão significa
 * poder levar tudo embora e poder apagar tudo, sem precisar pedir a
 * ninguém.
 *
 * A exclusão apaga a conta inteira e não tem volta. Por isso exige que
 * ela escreva a palavra, não apenas confirme num diálogo que se clica
 * sem ler.
 */

const PALAVRA_DE_CONFIRMACAO = 'APAGAR';

export default function MeusDados() {
  const [exportando, setExportando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [palavra, setPalavra] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const exportar = async () => {
    setExportando(true);
    setErro(null);

    const { data, error } = await supabase.rpc('exportar_meus_dados');

    setExportando(false);

    if (error) {
      console.error('Falha ao exportar dados:', error.message);
      setErro('Não consegui montar o arquivo agora. Tente de novo em instantes.');
      return;
    }

    // O arquivo é montado e baixado no próprio dispositivo: nada passa
    // por outro serviço no caminho.
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `netzach-meus-dados-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const excluir = async () => {
    if (palavra.trim().toUpperCase() !== PALAVRA_DE_CONFIRMACAO) return;

    setExcluindo(true);
    setErro(null);

    const { error } = await supabase.rpc('excluir_meus_dados');

    if (error) {
      console.error('Falha ao excluir dados:', error.message);
      setErro('Não consegui concluir agora. Tente de novo, ou escreva para o suporte.');
      setExcluindo(false);
      return;
    }

    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <section className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-netzach-gold" aria-hidden="true" />
        <h2 className="font-mystic text-netzach-gold">Seus dados</h2>
      </div>

      <p className="text-sm text-netzach-muted leading-relaxed">
        Tudo que você registra aqui é seu: ciclo, humor, sonhos, gratidões e consultas.
        Ninguém além de você tem acesso, e você pode levar tudo embora quando quiser.
      </p>

      <button onClick={exportar} disabled={exportando}
        className="w-full border border-netzach-border text-netzach-text py-3 rounded-xl hover:border-netzach-gold/50 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50">
        <Download size={15} aria-hidden="true" />
        {exportando ? 'Preparando seu arquivo...' : 'Baixar tudo que é meu'}
      </button>

      {erro && <p role="alert" className="text-sm text-netzach-rose">{erro}</p>}

      <div className="border-t border-netzach-border pt-4">
        {!confirmando ? (
          <button onClick={() => setConfirmando(true)}
            className="text-xs text-netzach-muted hover:text-netzach-rose transition-colors flex items-center gap-1.5">
            <Trash2 size={12} aria-hidden="true" />
            Apagar minha conta e todos os meus dados
          </button>
        ) : (
          <div className="space-y-3 fade-up">
            <p className="text-sm text-netzach-text leading-relaxed">
              Isso apaga sua conta e tudo que você guardou: check-ins, sonhos, gratidões,
              grimório e histórico. <strong className="text-netzach-rose">Não tem volta.</strong>
            </p>
            <p className="text-xs text-netzach-muted">
              Se quiser guardar uma cópia antes, baixe o arquivo acima. Para confirmar,
              escreva <strong className="text-netzach-text">{PALAVRA_DE_CONFIRMACAO}</strong> abaixo.
            </p>

            <input
              value={palavra}
              onChange={e => setPalavra(e.target.value)}
              placeholder={PALAVRA_DE_CONFIRMACAO}
              aria-label={`Escreva ${PALAVRA_DE_CONFIRMACAO} para confirmar`}
              className="input-mystic"
            />

            <div className="flex gap-2">
              <button onClick={() => { setConfirmando(false); setPalavra(''); setErro(null); }}
                className="flex-[2] border border-netzach-border text-netzach-text py-2.5 rounded-xl hover:border-netzach-gold/50 transition-colors text-sm">
                Manter minha conta
              </button>
              <button
                onClick={excluir}
                disabled={palavra.trim().toUpperCase() !== PALAVRA_DE_CONFIRMACAO || excluindo}
                className="flex-1 border border-netzach-rose/50 text-netzach-rose py-2.5 rounded-xl hover:bg-netzach-rose/10 transition-colors text-sm disabled:opacity-30">
                {excluindo ? 'Apagando...' : 'Apagar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
