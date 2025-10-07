import express from 'express';
import { AppDataSource } from '../data-source';
import { Cliente, TipoCliente } from '../entities/Cliente';
import { ClienteApiService } from '../services/ClienteApiService';

const router = express.Router();
const clienteRepository = AppDataSource.getRepository(Cliente);

// Função auxiliar para validar CPF (implementação simplificada)
function validarCPF(cpf: string): boolean {
    const cpfLimpo = cpf.replace(/[^\d]/g, '');
    
    if (cpfLimpo.length !== 11 || /^(\d)\1{10}$/.test(cpfLimpo)) {
        return false;
    }
    
    // Cálculo de verificação simplificado
    // Na versão de produção, usar uma validação mais completa
    return true;
}

// Função auxiliar para validar CNPJ (implementação simplificada)
function validarCNPJ(cnpj: string): boolean {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    
    if (cnpjLimpo.length !== 14 || /^(\d)\1{13}$/.test(cnpjLimpo)) {
        return false;
    }
    
    // Cálculo de verificação simplificado
    // Na versão de produção, usar uma validação mais completa
    return true;
}

// Listar todos os clientes (com paginação)
router.get('/', async (req, res): Promise<void> => {
    try {
        const { page = 1, limit = 20, tipo, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        
        let query = clienteRepository.createQueryBuilder('cliente');
        
        // Filtrar por tipo (PF ou PJ)
        if (tipo) {
            const tipoCliente = tipo === 'PF' ? TipoCliente.PESSOA_FISICA : TipoCliente.PESSOA_JURIDICA;
            query = query.where('cliente.tipo = :tipo', { tipo: tipoCliente });
        }
        
        // Pesquisar por nome, CPF ou CNPJ
        if (search) {
            query = query.andWhere('(cliente.nome ILIKE :search OR cliente.cpf LIKE :search OR cliente.cnpj LIKE :search)', 
                { search: `%${search}%` });
        }
        
        const [clientes, total] = await query
            .skip(skip)
            .take(Number(limit))
            .orderBy('cliente.criadoEm', 'DESC')
            .getManyAndCount();
        
        res.json({
            clientes,
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit))
        });
    } catch (error: any) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro ao listar clientes', 
            erro: error.message || 'Erro desconhecido'
        });
        return;
    }
});

// Obter cliente por ID
router.get('/:id', async (req, res): Promise<void> => {
    try {
        const cliente = await clienteRepository.findOne({ 
            where: { id: req.params.id }
        });
        
        if (!cliente) {
            res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Cliente não encontrado'
            });
            return;
        }
        
        res.json(cliente);
        return;
    } catch (error: any) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro ao buscar cliente', 
            erro: error.message || 'Erro desconhecido'
        });
        return;
    }
});

// Criar novo cliente
router.post('/', async (req, res): Promise<void> => {
    try {
        const { cpf, cnpj, ...dadosCliente } = req.body;
        
        // Verificar se é pessoa física ou jurídica
        if (cpf) {
            // Validar CPF
            if (!validarCPF(cpf)) {
                res.status(400).json({ 
                    sucesso: false, 
                    mensagem: 'CPF inválido' 
                });
                return;
            }
            
            // Verificar se CPF já existe
            const clienteExistente = await clienteRepository.findOne({ where: { cpf } });
            if (clienteExistente) {
                res.status(400).json({ 
                    sucesso: false, 
                    mensagem: 'CPF já cadastrado' 
                });
                return;
            }
            
            // Buscar dados na API
            const apiResponse = await ClienteApiService.buscarPorCPF(cpf);
            
            let novoCliente;
            if (apiResponse.sucesso) {
                // Mapear dados da API para o modelo Cliente
                const dadosMapeados = ClienteApiService.mapearDadosParaCliente(
                    apiResponse.dados, 
                    TipoCliente.PESSOA_FISICA
                );
                
                // Mesclar dados da API com os dados fornecidos pelo usuário
                novoCliente = clienteRepository.create({
                    ...dadosMapeados,
                    ...dadosCliente,
                    tipo: TipoCliente.PESSOA_FISICA,
                    cpf
                });
            } else {
                // Criar cliente apenas com os dados fornecidos
                novoCliente = clienteRepository.create({
                    ...dadosCliente,
                    tipo: TipoCliente.PESSOA_FISICA,
                    cpf,
                    dadosVerificados: false
                });
            }
            
            await clienteRepository.save(novoCliente);
            res.status(201).json({
                sucesso: true,
                mensagem: 'Cliente pessoa física cadastrado com sucesso',
                cliente: novoCliente
            });
            return;
            
        } else if (cnpj) {
            // Validar CNPJ
            if (!validarCNPJ(cnpj)) {
                res.status(400).json({ 
                    sucesso: false, 
                    mensagem: 'CNPJ inválido' 
                });
                return;
            }
            
            // Verificar se CNPJ já existe
            const clienteExistente = await clienteRepository.findOne({ where: { cnpj } });
            if (clienteExistente) {
                res.status(400).json({ 
                    sucesso: false, 
                    mensagem: 'CNPJ já cadastrado' 
                });
                return;
            }
            
            // Buscar dados na API
            const apiResponse = await ClienteApiService.buscarPorCNPJ(cnpj);
            
            let novoCliente;
            if (apiResponse.sucesso) {
                // Mapear dados da API para o modelo Cliente
                const dadosMapeados = ClienteApiService.mapearDadosParaCliente(
                    apiResponse.dados, 
                    TipoCliente.PESSOA_JURIDICA
                );
                
                // Mesclar dados da API com os dados fornecidos pelo usuário
                novoCliente = clienteRepository.create({
                    ...dadosMapeados,
                    ...dadosCliente,
                    tipo: TipoCliente.PESSOA_JURIDICA,
                    cnpj
                });
            } else {
                // Criar cliente apenas com os dados fornecidos
                novoCliente = clienteRepository.create({
                    ...dadosCliente,
                    tipo: TipoCliente.PESSOA_JURIDICA,
                    cnpj,
                    dadosVerificados: false
                });
            }
            
            await clienteRepository.save(novoCliente);
            res.status(201).json({
                sucesso: true,
                mensagem: 'Cliente pessoa jurídica cadastrado com sucesso',
                cliente: novoCliente
            });
            return;
            
        } else {
            res.status(400).json({ 
                sucesso: false, 
                mensagem: 'CPF ou CNPJ são obrigatórios' 
            });
            return;
        }
    } catch (error: any) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro ao criar cliente', 
            erro: error.message || 'Erro desconhecido'
        });
        return;
    }
});

// Atualizar cliente
router.put('/:id', async (req, res): Promise<void> => {
    try {
        const id = req.params.id;
        const cliente = await clienteRepository.findOne({ where: { id } });
        
        if (!cliente) {
            res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Cliente não encontrado' 
            });
            return;
        }
        
        // Não permitir alterar CPF/CNPJ
        const { cpf, cnpj, ...dadosAtualizados } = req.body;
        
        // Atualizar cliente
        clienteRepository.merge(cliente, dadosAtualizados);
        const clienteAtualizado = await clienteRepository.save(cliente);
        
        res.json({
            sucesso: true,
            mensagem: 'Cliente atualizado com sucesso',
            cliente: clienteAtualizado
        });
        return;
    } catch (error: any) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro ao atualizar cliente', 
            erro: error.message || 'Erro desconhecido'
        });
        return;
    }
});

// Excluir cliente (exclusão lógica - apenas marca como inativo)
router.delete('/:id', async (req, res): Promise<void> => {
    try {
        const id = req.params.id;
        const cliente = await clienteRepository.findOne({ where: { id } });
        
        if (!cliente) {
            res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Cliente não encontrado' 
            });
            return;
        }
        
        // Exclusão lógica (apenas marca como inativo)
        cliente.ativo = false;
        await clienteRepository.save(cliente);
        
        res.json({
            sucesso: true,
            mensagem: 'Cliente excluído com sucesso'
        });
        return;
    } catch (error: any) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro ao excluir cliente', 
            erro: error.message || 'Erro desconhecido'
        });
        return;
    }
});

// Revalidar dados através da API externa
router.post('/:id/revalidar', async (req, res): Promise<void> => {
    try {
        const id = req.params.id;
        const cliente = await clienteRepository.findOne({ where: { id } });
        
        if (!cliente) {
            res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Cliente não encontrado' 
            });
            return;
        }
        
        let apiResponse;
        if (cliente.isPessoaFisica()) {
            apiResponse = await ClienteApiService.buscarPorCPF(cliente.cpf);
        } else {
            apiResponse = await ClienteApiService.buscarPorCNPJ(cliente.cnpj);
        }
        
        if (apiResponse.sucesso) {
            // Mapear dados atualizados
            const dadosMapeados = ClienteApiService.mapearDadosParaCliente(
                apiResponse.dados,
                cliente.tipo
            );
            
            // Atualizar dados do cliente
            clienteRepository.merge(cliente, {
                ...dadosMapeados,
                dadosVerificados: true
            });
            
            const clienteAtualizado = await clienteRepository.save(cliente);
            
            res.json({
                sucesso: true,
                mensagem: 'Dados do cliente revalidados com sucesso',
                cliente: clienteAtualizado
            });
            return;
        } else {
            res.status(400).json({
                sucesso: false,
                mensagem: 'Não foi possível revalidar os dados do cliente',
                erro: apiResponse.mensagem
            });
            return;
        }
    } catch (error: any) {
        console.error('Erro ao revalidar dados do cliente:', error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro ao revalidar dados do cliente', 
            erro: error.message || 'Erro desconhecido'
        });
        return;
    }
});

export default router;