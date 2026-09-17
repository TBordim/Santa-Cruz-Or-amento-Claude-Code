import { sessaoAtual } from "@/lib/permissions";

export default async function HomePage() {
  const sessao = await sessaoAtual();

  return (
    <>
      <div className="view-header">
        <div>
          <h2>Bem-vindo, {sessao?.nome}</h2>
          <p>
            Fase 1 (Fundação) concluída: login com PIN hasheado e sessão de servidor, além da tela de
            Administração. O fluxo de 6 etapas (Solicitação → Engenharia → Orçamento → Diretoria →
            Envio de Oferta → Finalizado) chega na próxima fase.
          </p>
        </div>
      </div>
      <div className="empty-state">Em construção — o Painel aparece aqui na Fase 2.</div>
    </>
  );
}
