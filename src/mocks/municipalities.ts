import type { City } from './db'

/** Sample of the IBGE municipalities list the backend would serve. */
export const MUNICIPALITIES: City[] = [
  ['Rio Branco', 'AC'], ['Maceió', 'AL'], ['Macapá', 'AP'], ['Manaus', 'AM'], ['Salvador', 'BA'],
  ['Feira de Santana', 'BA'], ['Fortaleza', 'CE'], ['Juazeiro do Norte', 'CE'], ['Brasília', 'DF'],
  ['Vitória', 'ES'], ['Vila Velha', 'ES'], ['Goiânia', 'GO'], ['Anápolis', 'GO'], ['São Luís', 'MA'],
  ['Cuiabá', 'MT'], ['Campo Grande', 'MS'], ['Belo Horizonte', 'MG'], ['Uberlândia', 'MG'],
  ['Juiz de Fora', 'MG'], ['Contagem', 'MG'], ['Belém', 'PA'], ['João Pessoa', 'PB'], ['Campina Grande', 'PB'],
  ['Curitiba', 'PR'], ['Londrina', 'PR'], ['Maringá', 'PR'], ['Recife', 'PE'], ['Olinda', 'PE'],
  ['Caruaru', 'PE'], ['Teresina', 'PI'], ['Rio de Janeiro', 'RJ'], ['Niterói', 'RJ'], ['Duque de Caxias', 'RJ'],
  ['Natal', 'RN'], ['Mossoró', 'RN'], ['Porto Alegre', 'RS'], ['Caxias do Sul', 'RS'], ['Pelotas', 'RS'],
  ['Porto Velho', 'RO'], ['Boa Vista', 'RR'], ['Florianópolis', 'SC'], ['Joinville', 'SC'], ['Blumenau', 'SC'],
  ['São Paulo', 'SP'], ['Campinas', 'SP'], ['Guarulhos', 'SP'], ['Santos', 'SP'], ['São José dos Campos', 'SP'],
  ['Ribeirão Preto', 'SP'], ['Sorocaba', 'SP'], ['São Bernardo do Campo', 'SP'], ['Aracaju', 'SE'], ['Palmas', 'TO'],
].map(([name, uf]) => ({ name, uf }))
