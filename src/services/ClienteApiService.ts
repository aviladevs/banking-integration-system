import axios from 'axios';
import { TipoCliente } from '../entities/Cliente';

export class ClienteApiService {
    /**
     * Busca dados de pessoa física no e-Social (simulado)
     * Na implementação real, é necessário obter credenciais específicas para o e-Social
     * @param cpf CPF para consulta
     */
    static async buscarPorCPF(cpf: string): Promise<any> {
        try {
            // Remover caracteres especiais do CPF
            const cpfLimpo = cpf.replace(/[^\d]/g, '');
            
            // Na implementação real, substituir pela URL correta da API do e-Social
            // Este é um exemplo usando a API Brasil (aberta) como alternativa
            const url = `https://brasilapi.com.br/api/cpf/v1/${cpfLimpo}`;
            
            const response = await axios.get(url);
            return {
                sucesso: true,
                tipo: TipoCliente.PESSOA_FISICA,
                dados: response.data
            };
        } catch (error) {
            console.error('Erro ao buscar dados do CPF:', error);
            return {
                sucesso: false,
                // mensagem: 'Não foi possível consultar os dados do CPF',
                erro: error
            };
        }
    }

    /**
     * Busca dados de pessoa jurídica na API Brasil
     * @param cnpj CNPJ para consulta
     */
    static async buscarPorCNPJ(cnpj: string): Promise<any> {
        try {
            // Remover caracteres especiais do CNPJ
            const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
            
            // API Brasil é gratuita e pública
            const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`;
            
            const response = await axios.get(url);
            return {
                sucesso: true,
                tipo: TipoCliente.PESSOA_JURIDICA,
                dados: response.data
            };
        } catch (error) {
            console.error('Erro ao buscar dados do CNPJ:', error);
            return {
                sucesso: false,
                mensagem: 'Não foi possível consultar os dados do CNPJ',
                erro: error
            };
        }
    }

    /**
     * Mapeia dados da API para o formato da entidade Cliente
     * @param apiData Dados retornados da API
     * @param tipoCliente Tipo do cliente (PF ou PJ)
     */
    static mapearDadosParaCliente(apiData: any, tipoCliente: TipoCliente): any {
        if (tipoCliente === TipoCliente.PESSOA_FISICA) {
            // Mapear dados de pessoa física
            return {
                tipo: TipoCliente.PESSOA_FISICA,
                nome: apiData.nome || '',
                cpf: apiData.cpf || '',
                dataNascimento: apiData.data_nascimento ? new Date(apiData.data_nascimento) : null,
                dadosVerificados: true,
                dadosExternos: apiData
            };
        } else {
            // Mapear dados de pessoa jurídica
            return {
                tipo: TipoCliente.PESSOA_JURIDICA,
                nome: apiData.razao_social || '',
                nomeFantasia: apiData.nome_fantasia || '',
                cnpj: apiData.cnpj || '',
                telefone: apiData.ddd_telefone_1 ? `${apiData.ddd_telefone_1}${apiData.telefone_1}` : '',
                endereco: apiData.logradouro || '',
                numero: apiData.numero || '',
                complemento: apiData.complemento || '',
                bairro: apiData.bairro || '',
                cidade: apiData.municipio || '',
                estado: apiData.uf || '',
                cep: apiData.cep || '',
                atividadePrincipal: apiData.cnae_fiscal_descricao || '',
                dataAbertura: apiData.data_inicio_atividade ? new Date(apiData.data_inicio_atividade) : null,
                capitalSocial: apiData.capital_social || 0,
                naturezaJuridica: apiData.natureza_juridica || '',
                dadosVerificados: true,
                dadosExternos: apiData
            };
        }
    }
}