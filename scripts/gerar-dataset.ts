import { escreverDataset, manifesto } from '../src/dataset/gerar';

const itens = escreverDataset();
console.log(JSON.stringify(manifesto(itens), null, 2));
