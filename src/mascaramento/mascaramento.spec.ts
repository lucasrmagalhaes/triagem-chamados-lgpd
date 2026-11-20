import { describe, expect, it } from 'vitest';
import { assertSemPii, BloqueioPii, cpfValido, detectarPii, mascararTexto } from './mascaramento';

describe('mascaramento de dados pessoais', () => {
  it('valida o digito do CPF', () => {
    expect(cpfValido('39053344705')).toBe(true);
    expect(cpfValido('11111111111')).toBe(false);
    expect(cpfValido('123')).toBe(false);
  });

  it('mascara CPF, email, telefone e nome antes de sobrar algum padrao conhecido', () => {
    const original =
      'aqui e o Joao Silva, cpf 390.533.447-05 e tambem 39053344705, email ana.silva@exemplo.com, fone (11) 98888-7777 e +55 21 97777-6666.';
    const resultado = mascararTexto(original);

    expect(resultado.tipos).toEqual(['cpf', 'email', 'telefone', 'nome']);
    expect(resultado.texto).not.toMatch(/390/);
    expect(resultado.texto).not.toMatch(/silva@/i);
    expect(resultado.texto).not.toMatch(/98888/);
    expect(resultado.texto).not.toMatch(/97777/);
    expect(resultado.texto).not.toMatch(/joao/i);
    expect(resultado.texto).toContain('[CPF_1]');
    expect(resultado.texto).toContain('[EMAIL_1]');
    expect(resultado.texto).toContain('[TELEFONE_1]');
    expect(resultado.texto).toContain('[NOME_1]');
    expect(() => assertSemPii(resultado.texto)).not.toThrow();
  });

  it('repete o mesmo token para o mesmo CPF', () => {
    const resultado = mascararTexto('cpf 390.533.447-05 de novo 39053344705');
    expect(resultado.texto.match(/\[CPF_1\]/g)).toHaveLength(2);
    expect(resultado.texto).not.toContain('[CPF_2]');
  });

  it('mascara celular sem pontuacao e preserva numero que nao e CPF nem telefone', () => {
    expect(mascararTexto('me liga 11988887777 por favor').texto).toContain('[TELEFONE_1]');
    const pedido = 'o pedido interno e 1234567890123, sem pressa';
    expect(mascararTexto(pedido).texto).toBe(pedido);
  });

  it('mascara CPF formatado mesmo com digito invalido e ignora 11 digitos invalidos', () => {
    expect(mascararTexto('documento 111.111.111-11 no formulario').texto).toContain('[CPF_1]');
    expect(mascararTexto('protocolo 11111111111 aberto ontem').texto).toContain('11111111111');
  });

  it('mascara nome introduzido fora do dicionario e para antes de palavra comum', () => {
    const resultado = mascararTexto('me chamo Zuleica Pires e o boleto nao caiu');
    expect(resultado.texto).toContain('[NOME_1]');
    expect(resultado.texto).not.toMatch(/zuleica/i);
    expect(resultado.texto).not.toMatch(/pires/i);
    expect(resultado.texto).toContain('boleto');

    const financeiro = mascararTexto('me chamo Ana do financeiro, o boleto nao caiu');
    expect(financeiro.texto).toContain('financeiro');
    expect(financeiro.texto).toContain('boleto');
    expect(financeiro.texto).not.toMatch(/\bana\b/i);
  });

  it('nao trata o telefone depois de me chama no como nome', () => {
    const resultado = mascararTexto('me chama no (11) 98888-7777 quando puder');
    expect(resultado.tipos).toContain('telefone');
    expect(resultado.tipos).not.toContain('nome');
    expect(resultado.texto).toContain('[TELEFONE_1]');
  });

  it('e idempotente e o guardrail barra texto cru', () => {
    const umaVez = mascararTexto('senha da camila ferreira, email c.ferreira@exemplo.com');
    const duasVezes = mascararTexto(umaVez.texto);
    expect(duasVezes.texto).toBe(umaVez.texto);
    expect(() => assertSemPii('cpf 390.533.447-05')).toThrow(BloqueioPii);
    expect(detectarPii('atraso de dois dias na entrega')).toEqual([]);
  });
});
