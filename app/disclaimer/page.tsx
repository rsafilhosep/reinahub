import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";

const sourceCredits = [
  "Dados e informações podem ser derivados de arquivos locais, referências públicas, fontes oficiais, fontes comunitárias e revisões manuais.",
  "Arquivos em files_repository são material bruto de estudo e não são executados pelo ReinaHub.",
  "Fontes externas são usadas como referência para formar uma base local revisável, sem dependência obrigatória em runtime."
];

export default function DisclaimerPage() {
  return (
    <AppShell current="legal" mark="IR" subtitle="Isenção de responsabilidade">
      <Panel title="Isenção de responsabilidade" eyebrow="projeto independente">
        <div className="legal-page">
          <p>
            O ReinaHub é um projeto independente, criado por jogadores apaixonados por Tibia para ajudar a
            comunidade com análises, ferramentas e informações úteis.
          </p>
          <p>
            Este projeto não possui qualquer vínculo, parceria, aprovação ou afiliação oficial com a
            desenvolvedora do jogo ou com seus serviços oficiais.
          </p>
          <p>
            As informações apresentadas são estimativas, análises e dados obtidos por meio de pesquisas,
            dados públicos, contribuições da comunidade, arquivos locais e cálculos próprios. Embora exista
            cuidado na coleta e no processamento, valores, preços, probabilidades, estatísticas e demais
            informações podem conter divergências, estar desatualizados ou mudar sem aviso prévio.
          </p>
          <p>
            Sempre confirme informações importantes diretamente dentro do jogo, no site oficial ou em canais
            oficiais antes de tomar decisões envolvendo mercado, compras, vendas, hunts, personagens ou
            servidores.
          </p>
        </div>
      </Panel>

      <Panel title="Uso das ferramentas" eyebrow="estimativas - apoio - revisão">
        <div className="legal-page">
          <p>
            As ferramentas do ReinaHub foram criadas para auxiliar decisões durante a aventura. Elas não
            constituem garantia de precisão absoluta, lucro, disponibilidade de itens, estabilidade de
            servidores ou equivalência exata entre mundos diferentes.
          </p>
          <p>
            OTServers, mundos oficiais, mercados e moedas premium podem ter regras, preços e disponibilidade
            diferentes. O usuário é responsável por revisar os dados cadastrados, especialmente cotações,
            preços externos, valores de NPC, itens de Stash e objetivos pessoais.
          </p>
        </div>
      </Panel>

      <Panel title="Privacidade e cookies" eyebrow="armazenamento local">
        <div className="legal-page">
          <p>
            O ReinaHub usa armazenamento local do navegador para salvar preferencias e dados das ferramentas,
            como tema, perfil ativo, cotacoes, personagens, stash, hunts salvas, metas e configuracoes de
            overlay.
          </p>
          <p>
            Esses dados ficam no dispositivo do usuario e servem para evitar retrabalho ao atualizar a pagina.
            O projeto esta preparado para areas futuras de anuncios, doacoes e parcerias, mantendo esses
            espacos separados dos dados do jogador.
          </p>
          <p>
            Caso o ReinaHub passe a usar servicos externos de analise, anuncios ou login, esta pagina devera
            ser atualizada com uma politica de privacidade mais detalhada antes da ativacao dessas integracoes.
          </p>
        </div>
      </Panel>

      <Panel title="Marcas e independência" eyebrow="Tibia - CipSoft">
        <div className="legal-page">
          <p>
            Tibia® é uma marca registrada da CipSoft GmbH. O ReinaHub é um projeto independente, sem qualquer
            afiliação, parceria, endosso ou aprovação oficial da CipSoft GmbH.
          </p>
          <p>
            Todas as marcas, nomes, imagens, sprites e referências pertencem aos seus respectivos titulares.
            O uso no ReinaHub tem finalidade informativa, organizacional e comunitária.
          </p>
          <p className="note">
            Referência oficial consultada:{" "}
            <Link href="https://www.tibia.com/abouttibia/?subtopic=aboutcipsoft">
              tibia.com/aboutcipsoft
            </Link>
            .
          </p>
        </div>
      </Panel>

      <Panel title="Fontes e créditos" eyebrow="base local revisável">
        <div className="history-list">
          {sourceCredits.map((item) => (
            <div className="history-item" key={item}>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <p className="note">
          Esta página poderá receber futuramente política de privacidade, termos de uso, créditos detalhados
          das fontes e regras de integração.
        </p>
      </Panel>
    </AppShell>
  );
}
