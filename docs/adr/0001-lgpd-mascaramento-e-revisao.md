# ADR 0001: Mascarar antes do modelo e revisar o que o modelo não sustenta

## Contexto

A triagem automática de chamados manda texto livre para um provedor de LLM. No Brasil, CPF, email, telefone e nome identificam uma pessoa. A LGPD pede minimização, finalidade e cuidado com decisão automatizada. O provedor do modelo pode estar fora do país. Este serviço não é o sistema de registro do helpdesk. Ele só classifica.

## Decisão

1. O mascaramento roda no processo da API, antes do embedding e antes do agente. CPF, email, telefone e nome conhecido ou introduzido por uma frase ("me chamo", "aqui é o") viram marcadores `[CPF_1]`, `[EMAIL_1]`, `[TELEFONE_1]` e `[NOME_1]`.
2. Um guardrail repete a detecção no texto que vai para o modelo. Se ainda houver padrão conhecido, a chamada não sai e o evento `bloqueio_pii` guarda só o hash e os tipos. O texto mascarado que ainda contém dado pessoal não é persistido.
3. O Postgres, o log de auditoria, a fila de revisão e o Langfuse, quando ligado, recebem o texto mascarado ou só metadados da decisão. O hash SHA-256 do texto original serve para correlacionar com o chamado no helpdesk, que continua dono do texto cru.
4. Comentário de revisor humano também passa pelo mascaramento antes de gravar.
5. Confiança abaixo do limiar (padrão 0,72) troca a fila efetiva para `fila_revisao`. O modelo não escolhe essa fila. A pessoa revisora grava a decisão final. Isso dá uma revisão humana para o caso incerto, no espírito do direito de revisão de decisão automatizada.
6. A API e o banco do esqueleto Terraform ficam em `sa-east-1`, com RDS criptografado. A chamada de modelo ainda sai por um provedor. O mascaramento é o que torna esse envio aceitável neste MVP. A retenção no provedor depende da configuração do projeto no AI Gateway.
7. O dataset deste repositório é sintético. Ele existe para teste e avaliação. Não contém dado de cliente real.

## Consequências

O revisor desta API vê o texto mascarado. Para ligar de volta para a pessoa, o helpdesk usa a `referenciaExterna` e o registro original, fora deste serviço.

Nome fora do dicionário e sem frase de apresentação pode passar. O guardrail cobre os mesmos padrões do mascarador, então ele não inventa uma detecção que o mascarador não tenha. CPF sem pontuação só entra se o dígito verificador fechar, para não apagar número de pedido. Telefone e email seguem formatos comuns do Brasil.

Trocar o modelo de embedding exige novo seed. Vetores de famílias diferentes não se misturam. Se o identificador gravado divergir, a busca de exemplos fica desligada em vez de devolver vizinhos sem sentido.

## Fora deste MVP

Criptografar o texto original com KMS em uma base separada, com acesso só da fila humana. Contrato de não retenção com o provedor. Modelo hospedado no Brasil. Revisor com a versão completa no helpdesk, nunca neste log.
