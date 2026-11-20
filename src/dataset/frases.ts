import type { Categoria, Prioridade } from '../dominio/taxonomia';

/**
 * Miúdos de chamado informal. O rótulo mora na cena, não numa frase de fechamento.
 * Léxico usa uma palavra que o baseline reconhece. Paráfrase conta a mesma situação
 * com outro vocabulário. Ambíguo deixa duas leituras defensáveis.
 */
export const LEXICO: Record<Categoria, Record<Prioridade, string[]>> = {
  acesso: {
    baixa: [
      'a senha do portal pede de novo de vez em quando, nada que pare a loja',
      'o login entra, só queria permissao de leitura no modulo antigo',
      'autenticacao as vezes pede o codigo duas vezes, quando puder a gente ve',
    ],
    media: [
      'meu login nao aceita a senha desde ontem de manha',
      'a autenticacao do erp recusa o usuario, ja tentei sair e voltar',
      'perdi a permissao do modulo de metas e o login nao mostra o menu',
    ],
    alta: [
      'to na frente da fila e o login nao passa, a senha nao aceita',
      'a senha nao aceita bem na hora da venda',
      'cliente cobrando, nao entra no portal e o usuario travado',
    ],
    urgente: [
      'a vpn caiu e ninguem faz login, a loja inteira parou de vender',
      'a autenticacao recusou todo mundo e o deposito ficou sem operar',
      'urgente: autenticacao fora, producao parada, nao consigo trabalhar',
    ],
  },
  pagamento: {
    baixa: [
      'o boleto do mes passado consta em aberto, mas eu acho que ja paguei',
      'confere se o pix de uma taxa pequena compensou, da pra ser depois',
      'a nota fiscal saiu com o nome abreviado, so uma duvida de conciliacao',
    ],
    media: [
      'o pix do pedido 441 nao aparece na conciliacao e a fatura fechou diferente',
      'pagamento em duplicidade no boleto, a fatura veio duas vezes',
      'o reembolso do pix nao voltou, o financeiro nao achou na conciliacao',
    ],
    alta: [
      'o comprovante nao sai e o pix nao compensou na fatura, a pessoa espera no caixa',
      'o boleto venceu e o pagamento nao baixou, a saida da mercadoria segurou',
      'cliente cobrando hoje, a nota fiscal nao sai e o pagamento nao baixou',
    ],
    urgente: [
      'o pagamento caiu, pix e boleto recusam, a frente de caixa ficou sem receber',
      'a conciliacao zerou e ninguem consegue receber',
      'urgente, o reembolso nao sai e o gateway de pagamento nao responde, producao parada',
    ],
  },
  bug: {
    baixa: [
      'a tela branca aparece um segundo no relatorio, incomoda pouco',
      'tem uma lentidao chata no fim da tarde, da pra olhar depois',
      'so uma duvida se aquele timeout antigo ainda conta como bug',
    ],
    media: [
      'o relatorio nao abre, fica um timeout e volta pra tela branca',
      'subiu um bug no modulo de metas, a excecao estoura no meio',
      'lentidao forte depois do almoco, a tela branca toma o painel',
    ],
    alta: [
      'no fechamento a tela branca nao deixa o modulo abrir',
      'timeout toda venda, o bug derruba o caixa e a fila cresce',
      'erro 500 hoje, a excecao derruba o relatorio e o cliente cobrando o numero',
    ],
    urgente: [
      'bug derrubou o modulo, tela branca pra todo mundo, ninguem consegue vender',
      'timeout em cadeia e a excecao nao deixa vender',
      'urgente, sistema fora por causa do bug, nao consigo trabalhar, so tela branca',
    ],
  },
  cadastro: {
    baixa: [
      'o endereco da filial no cadastro ta com o cep antigo, da pra ajustar depois',
      'atualiza a razao social quando der, o cnpj em si nao mudou',
      'dados cadastrais do contato com um telefone velho, sem pressa no cadastro',
    ],
    media: [
      'preciso corrigir o cadastro da filial, o endereco mudou de rua',
      'o cnpj novo nao entra na razao social, o cadastro recusa',
      'os dados cadastrais da matriz voltaram pro endereco anterior',
    ],
    alta: [
      'a nota nao sai porque o cnpj do cadastro ta errado e a pessoa espera',
      'a filial nova nao existe no cadastro e a venda nao anda',
      'cliente cobrando hoje, endereco do cadastro bloqueado e nao entra pedido pra essa loja',
    ],
    urgente: [
      'cadastro da filial principal sumiu, cnpj rejeitado, ninguem consegue faturar',
      'a razao social zerou no cadastro e a loja nao emite',
      'urgente, nao consigo trabalhar, o endereco e o cnpj do cadastro foram pro limbo, sistema fora',
    ],
  },
  entrega: {
    baixa: [
      'o rastreio da entrega parou ontem a noite, a loja ainda tem estoque',
      've se a transportadora mudou o romaneio de uma carga pequena, da pra ser depois',
      'so uma duvida do atraso de um pedido atrasado que nem é grande',
    ],
    media: [
      'a entrega atrasou dois dias e o rastreio da transportadora nao anda',
      'a coleta nao passou, o romaneio sumiu e o pedido atrasado segue sem previsao',
      'transportadora confirma o atraso, a entrega saiu sem o volume certo',
    ],
    alta: [
      'o rastreio parou e a coleta nao aparece, a loja vai abrir sem a carga',
      'pedido atrasado, a transportadora nao responde e o deposito segurou a saida',
      'cliente cobrando a entrega hoje, o romaneio travou e a carga nao sai',
    ],
    urgente: [
      'entrega nao sai, rastreio morto e a loja sem mercadoria',
      'a coleta nao veio e a transportadora sumiu, o deposito inteiro esperando',
      'urgente, nao consigo trabalhar sem essa carga, producao parada, sistema fora no romaneio',
    ],
  },
  duvida: {
    baixa: [
      'como faco pra achar o menu de metas, a loja segue sem isso',
      'me explica o passo a passo de um relatorio, da pra ser com calma',
      'so uma duvida, queria um tutorial curto de como eu consulto o historico',
    ],
    media: [
      'como faco pra gerar o arquivo de comissao, me explica sem enrolar',
      'tenho uma duvida no fechamento, cadê o passo a passo desse tutorial',
      'como eu tiro esse relatorio, a duvida é só o caminho do menu',
    ],
    alta: [
      'eu nao sei o caminho, como faco pra achar essa tela com a pessoa esperando',
      'me explica o passo a passo, a duvida ta segurando o caixa',
      'cliente cobrando hoje, o tutorial nao bate e como eu fecho isso com a pessoa aqui',
    ],
    urgente: [
      'no meio do turno ninguem sabe reabrir, como faco pra seguir e a fila cresce',
      'preciso do passo a passo, sem esse tutorial o turno nao anda',
      'urgente, nao consigo trabalhar sem esse tutorial, me explica como eu destravo, producao parada',
    ],
  },
};

export const PARAFRASE: Record<Categoria, Record<Prioridade, string[]>> = {
  acesso: {
    baixa: [
      'de vez em quando o portal me joga pra tela inicial de novo, a loja segue vendendo',
      'queria usar a mesma conta no celular da loja, nada que pare o pessoal',
      'o codigo de confirmacao chega atrasado, da pra ver na proxima semana',
    ],
    media: [
      'nao to conseguindo passar da primeira tela do erp desde ontem',
      'minha conta do sistema fica recusando, ja saí e voltei umas tres vezes',
      'sumiu o menu do modulo de metas pra mim, os outros entram normal',
    ],
    alta: [
      'to na frente do cliente e o portal nao deixa eu seguir com a venda',
      'a conta bloqueou bem na hora de fechar, a fila da loja crescendo',
      'ninguem no caixa consegue abrir o sistema agora, o pessoal ta esperando',
    ],
    urgente: [
      'ninguem da loja consegue abrir o sistema, a linha de venda parou agora',
      'caiu o acesso de todo mundo, deposito de braco cruzado',
      'o portal recusou todas as contas juntas, a loja inteira sem vender',
    ],
  },
  pagamento: {
    baixa: [
      'uma cobranca pequena aparece em aberto e eu jurava que ja tinha quitado',
      'o comprovante de uma taxa nao aparece no financeiro, da pra ver depois',
      'o valor de um recibo saiu com centavos a mais, ninguem parado por isso',
    ],
    media: [
      'a transferencia do pedido 441 nao aparece e o valor fechado nao bate',
      'cobraram duas vezes a mesma coisa e o estorno nao voltou',
      'o comprovante sumiu e o financeiro nao acha a baixa',
    ],
    alta: [
      'a pessoa ta no balcao esperando o comprovante e o dinheiro nao caiu',
      'venceu a cobranca e a baixa nao aconteceu, segurando a saida da mercadoria',
      'nao consigo emitir o recibo e o cliente nao sai do caixa',
    ],
    urgente: [
      'nao passa nenhum recebimento, a frente de caixa parou agora',
      'o dinheiro nao entra de jeito nenhum e a loja nao fecha venda',
      'zerou a baixa das cobrancas e ninguem consegue receber',
    ],
  },
  bug: {
    baixa: [
      'a tela pisca e volta no relatorio, incomoda pouco',
      'fica lento no fim da tarde, a loja ainda trabalha',
      'um erro esquisito aparece e some, queria saber se ainda vale olhar',
    ],
    media: [
      'o painel abre, pensa, e volta pra uma pagina em branco',
      'o modulo de metas fecha sozinho no meio da conta',
      'demora demais e depois mostra um numero que nao existe',
    ],
    alta: [
      'na hora de fechar o caixa a tela apaga e o numero nao sai',
      'cada venda a pagina cai, o pessoal do balcao ta esperando',
      'o sistema solta um erro e derruba o relatorio que a gerencia pediu agora',
    ],
    urgente: [
      'a pagina em branco tomou todas as maquinas, ninguem vende',
      'o modulo fechou pra loja inteira agora, fila dobrando',
      'tudo que abre cai em seguida, o deposito parou de separar',
    ],
  },
  cadastro: {
    baixa: [
      'o cep da loja nova ficou o antigo, da pra ajustar com calma',
      'o nome fantasia saiu abreviado, a venda segue',
      'um contato velho ainda aparece na ficha, ninguem parado',
    ],
    media: [
      'a ficha da loja nova ta com a rua errada',
      'o numero da empresa nao grava, volta o anterior',
      'os dados da matriz voltaram pra unidade que a gente fechou',
    ],
    alta: [
      'a loja nova nao existe na ficha e a venda de agora nao anda',
      'o documento da empresa ta rejeitando e o cliente espera o recibo',
      'a rua gravada bloqueia o despacho de hoje a tarde',
    ],
    urgente: [
      'sumiu a ficha da loja principal e ninguem consegue faturar',
      'o documento da empresa zerou e a emissao parou agora',
      'sem a ficha certa a loja inteira nao tira pedido',
    ],
  },
  entrega: {
    baixa: [
      'uma carga pequena nao atualizou o paradeiro, a loja ainda tem estoque',
      'o motorista passou outro dia, queria só conferir uma caixa',
      'um volume pequeno atrasou, da pra repor na proxima',
    ],
    media: [
      'a carga atrasou dois dias e ninguem sabe onde o caminhao parou',
      'o motorista nao passou e o papel da saida sumiu',
      'saiu volume a menos e a loja vai ficar descoberta no fim de semana',
    ],
    alta: [
      'a loja abre amanha sem a carga e o pessoal ja ligou cobrando',
      'o caminhao nao saiu e o balcao precisa dessa mercadoria antes de abrir',
      'sumiu o paradeiro da carga grande e o gerente ta no telefone',
    ],
    urgente: [
      'a loja amanheceu sem mercadoria, o caminhao nao apareceu',
      'nenhuma carga saiu do deposito, a separacao parou',
      'o motorista sumiu com o volume principal e a loja nao abre sortimento',
    ],
  },
  duvida: {
    baixa: [
      'queria saber onde fica aquela tela de metas, nada parado',
      'me ensina depois o caminho do arquivo de comissao',
      'nao sei mexer no historico, pode ser com calma',
    ],
    media: [
      'nao acho o caminho pra gerar o arquivo de comissao',
      'a tela de fechamento mudou e eu nao sei onde clicaram',
      'queria entender como consultar o historico sem quebrar nada',
    ],
    alta: [
      'o cliente espera e eu nao acho a tela que fecha a conta',
      'me ensina o caminho agora, o balcao ta parado porque eu me perdi',
      'a tela nao bate com o que me passaram e a pessoa ta aqui',
    ],
    urgente: [
      'ninguem no turno sabe reabrir a tela e a venda parou',
      'to no meio do movimento sem saber o proximo clique, a fila dobrou',
      'sem esse caminho a loja nao termina o fechamento, todo mundo esperando',
    ],
  },
};

export const AMBIGUO: Record<Categoria, Record<Prioridade, string[]>> = {
  acesso: {
    baixa: [
      'a tela branca pisca e a senha pede de novo. acontece raro, a loja segue, e eu nao sei qual dos dois olhar',
      'o timeout some sozinho e o login as vezes recusa. nada que pare ninguem',
    ],
    media: [
      'nao sei se o login que recusa ou se a tela branca que volta. os dois acontecem juntos e eu preciso entrar',
      'o pix ate caiu. o que me trava é a senha, mas a lentidao do portal confunde',
    ],
    alta: [
      'a senha nao passa e a tela branca aparece no meio da venda, a fila da loja crescendo',
      'nao entra na conta e o timeout derruba o caixa. cliente cobrando hoje, o furo comeca na senha',
    ],
    urgente: [
      'a vpn caiu e a tela branca tomou o caixa, ninguem sabe qual derrubou a loja',
      'producao parada. o login de todo mundo recusa e o bug da tela branca voltou junto',
    ],
  },
  pagamento: {
    baixa: [
      'o boleto pequeno ficou em aberto e a tela branca pisca no financeiro. acho que é a cobranca, da pra ver depois',
      'a fatura estranhou uns centavos e eu nao acho o menu. sem pressa, o assunto é o valor',
    ],
    media: [
      'o pix nao baixou e a tela branca fica na conciliacao. quero o pagamento, o defeito é o que aparece em volta',
      'como faco pra achar a baixa? o reembolso nao voltou e eu to perdido no caminho',
    ],
    alta: [
      'o pix nao compensou e o login do financeiro tambem nao ajuda, a pessoa espera no caixa',
      'cliente cobrando hoje, o boleto venceu e a tela branca nao deixa eu ver a fatura',
    ],
    urgente: [
      'o pix recusa e a tela branca nao deixa abrir o caixa, a loja sem receber',
      'nao consigo trabalhar. o pagamento caiu e o login de quem recebe tambem morreu',
    ],
  },
  bug: {
    baixa: [
      'a lentidao incomoda e a senha pede de novo no fim do dia. o lento é o ponto, da pra ver depois',
      'timeout curto no relatorio e uma duvida de menu no meio. o defeito é raro',
    ],
    media: [
      'a tela branca volta e o login cai junto. o branco é o que se repete, a conta eu ate recupero',
      'o bug do relatorio continua e o pix dessa tela nem era pra entrar na conversa',
    ],
    alta: [
      'a tela branca no fechamento e o pessoal sem o numero, a fila cresceu',
      'erro 500 hoje, o timeout travou o caixa. tem boleto no meio da tela, mas o que derruba é o bug',
    ],
    urgente: [
      'tela branca em todas as maquinas e a vpn caiu no mesmo minuto, ninguem vende',
      'producao parada. o bug nao deixa vender e o rastreio da ultima carga tambem sumiu da tela',
    ],
  },
  cadastro: {
    baixa: [
      'o endereco da filial ta velho e eu nao acho o menu pra mudar. é a ficha, da pra ser depois',
      'a razao social saiu torta e a tela branca pisca ao gravar. o que precisa mudar é o cadastro',
    ],
    media: [
      'o cnpj nao grava e o login dessa tela expira no meio. o dado é o problema',
      'o endereco volta o antigo. a entrega dessa loja ate anda, a ficha que nao cola',
    ],
    alta: [
      'o cnpj do cadastro rejeita a nota e a tela branca atrapalha, a pessoa espera o recibo',
      'cliente cobrando hoje, a filial nova nao existe no cadastro e a senha de quem altera tambem falha',
    ],
    urgente: [
      'o cadastro da filial sumiu e o login de quem corrige caiu junto, ninguem emite',
      'producao parada na emissao. o cnpj zerou e a tela branca nao deixa reabrir a ficha',
    ],
  },
  entrega: {
    baixa: [
      'o rastreio parou numa carga pequena e eu tenho duvida de onde consultar. estoque ainda tem',
      'a coleta atrasou um dia e o cadastro do cep parece velho. quero saber da carga, da pra ser depois',
    ],
    media: [
      'a entrega sumiu e o boleto do frete tambem nao fecha. quero o paradeiro, o valor é secundario',
      'o romaneio nao aparece e a tela branca cai na consulta. o caminhao é o assunto',
    ],
    alta: [
      'o rastreio morreu e o pix do frete confunde o gerente, a loja vai abrir sem carga',
      'cliente cobrando a entrega hoje. pedido atrasado e o login de quem consulta o romaneio falha',
    ],
    urgente: [
      'a coleta nao veio e a tela branca derrubou a separacao, a loja sem mercadoria',
      'producao parada sem mercadoria. a transportadora sumiu e o bug do romaneio voltou junto',
    ],
  },
  duvida: {
    baixa: [
      'duvida leve de caminho, e a tela branca pisca no mesmo menu. queria só o passo a passo, com calma',
      'como faco pra achar o historico? o endereco da filial parece velho, mas a pergunta é o caminho',
    ],
    media: [
      'me explica o fechamento novo. o pix de um recibo tambem estranhou, a duvida é o caminho',
      'nao sei se é bug ou se eu que nao achei. como eu gero o arquivo sem quebrar a conta',
    ],
    alta: [
      'eu perdido no menu. me explica o passo a passo, a tela branca apareceu uma vez e a pessoa espera',
      'cliente cobrando hoje. como faco pra fechar, o login ate entra e o tutorial nao bate',
    ],
    urgente: [
      'ninguem sabe o proximo clique. me explica, o sistema ate abre e a tela branca assusta, a fila cresceu',
      'nao consigo trabalhar sem o passo a passo. tem quem fale de senha, pra mim falta o tutorial',
    ],
  },
};

export const ASIDES: Record<Categoria, string[]> = {
  acesso: [
    'no meio disso a senha de um colega tambem expirou',
    'e o login do ponto caiu no mesmo turno',
  ],
  pagamento: [
    'tem um pix de outra taxa que tambem nao caiu',
    'ficou um boleto em aberto de outra loja',
    'a fatura de uma taxa pequena tambem nao fecha',
  ],
  bug: [
    'e a tela branca voltou no relatorio',
    'deu timeout na hora de gravar',
  ],
  cadastro: [
    'o cnpj da filial nova tambem nao consta',
    'o endereco na ficha dessa loja ta velho',
    'a razao social de outra unidade saiu pela metade',
  ],
  entrega: [
    'a entrega de outra carga tambem atrasou',
    'o rastreio do segundo volume parou',
    'a transportadora dessa outra saida nao deu retorno',
  ],
  duvida: [
    'e eu ainda tenho duvida de onde clica depois',
    'se der, me explica o menu, mas o pepino é o de cima',
    'o tutorial desse outro passo eu nao achei',
  ],
};

export const SAUDACOES = ['oi', 'opa', 'bom dia', 'boa tarde', 'fala pessoal', 'e ai', 'oi, desculpa o texto'];

export const FECHOS = ['valeu', 'obrigado', 'abs', 'blz', 'kk', 'aff', 'qualquer coisa eu complemento'];

export const CONTEXTOS = [
  'desde cedo isso acontece',
  'na loja 12',
  'depois que atualizaram ontem',
  'no computador do caixa e no meu tambem',
  'to no celular, o dedo erra',
  'copiei o que me mandaram no whats',
  'ja reiniciei e continuou',
  'acontece direto essa semana',
  'na abertura da loja',
  'o turno da manha inteiro reclamou',
  'no fechamento de ontem a noite',
  'pediram pra eu abrir porque ninguem quer ficar no escuro',
];

export const RELATO =
  'a pessoa do caixa tentou duas vezes, chamou o colega, e nada. pediram pra eu registrar porque o pessoal nao quer ficar sem resposta. se puder olhar o historico da loja ajuda, mas o que eles me passaram é basicamente isso.';

export const FECHOS_PROIBIDOS = [
  'quando puder sem pressa',
  'fico no aguardo',
  'preciso disso hoje',
  'ta urgente e nao consigo trabalhar',
];
