import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";

const sourceCredits = [
  "Dados e informacoes podem ser derivados de arquivos locais, referencias publicas, fontes oficiais, fontes comunitarias e revisoes manuais.",
  "Arquivos em files_repository sao material bruto de estudo e nao sao executados pelo ReinaHub.",
  "Fontes externas sao usadas como referencia para formar uma base local revisavel, sem dependencia obrigatoria em runtime."
];

export default function DisclaimerPage() {
  return (
    <AppShell current="legal" mark="IR" subtitle="Isencao de responsabilidade">
      <Panel title="Isencao de responsabilidade" eyebrow="projeto independente">
        <div className="legal-page">
          <p>
            O ReinaHub e um projeto independente, criado por jogadores apaixonados por Tibia para ajudar a
            comunidade com analises, ferramentas e informacoes uteis.
          </p>
          <p>
            Este projeto nao possui qualquer vinculo, parceria, aprovacao ou afiliacao oficial com a
            desenvolvedora do jogo ou com seus servicos oficiais.
          </p>
          <p>
            As informacoes apresentadas sao estimativas, analises e dados obtidos por meio de pesquisas,
            dados publicos, contribuicoes da comunidade, arquivos locais e calculos proprios. Embora exista
            cuidado na coleta e no processamento, valores, precos, probabilidades, estatisticas e demais
            informacoes podem conter divergencias, estar desatualizados ou mudar sem aviso previo.
          </p>
          <p>
            Sempre confirme informacoes importantes diretamente dentro do jogo, no site oficial ou em canais
            oficiais antes de tomar decisoes envolvendo mercado, compras, vendas, hunts, personagens ou
            servidores.
          </p>
        </div>
      </Panel>

      <Panel title="Uso das ferramentas" eyebrow="estimativas - apoio - revisao">
        <div className="legal-page">
          <p>
            As ferramentas do ReinaHub foram criadas para auxiliar decisoes durante a aventura. Elas nao
            constituem garantia de precisao absoluta, lucro, disponibilidade de itens, estabilidade de
            servidores ou equivalencia exata entre mundos diferentes.
          </p>
          <p>
            OTServers, mundos oficiais, mercados e moedas premium podem ter regras, precos e disponibilidade
            diferentes. O usuario e responsavel por revisar os dados cadastrados, especialmente cotacoes,
            precos externos, valores de NPC, itens de Stash e objetivos pessoais.
          </p>
        </div>
      </Panel>

      <Panel title="Marcas e independencia" eyebrow="Tibia - CipSoft">
        <div className="legal-page">
          <p>
            Tibia® e uma marca registrada da CipSoft GmbH. O ReinaHub e um projeto independente, sem qualquer
            afiliacao, parceria, endosso ou aprovacao oficial da CipSoft GmbH.
          </p>
          <p>
            Todas as marcas, nomes, imagens, sprites e referencias pertencem aos seus respectivos titulares.
            O uso no ReinaHub tem finalidade informativa, organizacional e comunitaria.
          </p>
          <p className="note">
            Referencia oficial consultada:{" "}
            <Link href="https://www.tibia.com/abouttibia/?subtopic=aboutcipsoft">
              tibia.com/aboutcipsoft
            </Link>
            .
          </p>
        </div>
      </Panel>

      <Panel title="Fontes e creditos" eyebrow="base local revisavel">
        <div className="history-list">
          {sourceCredits.map((item) => (
            <div className="history-item" key={item}>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <p className="note">
          Esta pagina podera receber futuramente politica de privacidade, termos de uso, creditos detalhados
          das fontes e regras de integracao.
        </p>
      </Panel>
    </AppShell>
  );
}
