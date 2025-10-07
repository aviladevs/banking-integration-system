import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Enum para o tipo de cliente
export enum TipoCliente {
    PESSOA_FISICA = 'PF',
    PESSOA_JURIDICA = 'PJ'
}

@Entity('clientes')
export class Cliente {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    tipo: TipoCliente;

    // Campos comuns
    @Column()
    nome: string; // Nome completo (PF) ou Razão Social (PJ)

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    telefone: string;

    @Column({ nullable: true })
    celular: string;

    @Column({ nullable: true })
    endereco: string;

    @Column({ nullable: true })
    numero: string;

    @Column({ nullable: true })
    complemento: string;

    @Column({ nullable: true })
    bairro: string;

    @Column({ nullable: true })
    cidade: string;

    @Column({ nullable: true })
    estado: string;

    @Column({ nullable: true })
    cep: string;

    // Campos específicos para Pessoa Física
    @Column({ nullable: true, unique: true })
    cpf: string;

    @Column({ nullable: true })
    rg: string;

    @Column({ nullable: true })
    dataNascimento: Date;

    @Column({ nullable: true })
    estadoCivil: string;

    @Column({ nullable: true })
    profissao: string;

    // Campos específicos para Pessoa Jurídica
    @Column({ nullable: true, unique: true })
    cnpj: string;

    @Column({ nullable: true })
    nomeFantasia: string;

    @Column({ nullable: true })
    inscricaoEstadual: string;

    @Column({ nullable: true })
    inscricaoMunicipal: string;

    @Column({ nullable: true })
    atividadePrincipal: string;

    @Column({ nullable: true })
    naturezaJuridica: string;

    @Column({ nullable: true })
    dataAbertura: Date;

    @Column({ nullable: true })
    capitalSocial: number;

    // Campos para controle de API externa
    @Column({ default: false })
    dadosVerificados: boolean;

    @Column({ nullable: true, type: 'text' })
    dadosExternos: any; // Dados brutos da API

    @Column({ default: true })
    ativo: boolean;

    @CreateDateColumn()
    criadoEm: Date;

    @UpdateDateColumn()
    atualizadoEm: Date;

    // Métodos úteis
    isAtivo(): boolean {
        return this.ativo;
    }

    isPessoaFisica(): boolean {
        return this.tipo === TipoCliente.PESSOA_FISICA;
    }

    isPessoaJuridica(): boolean {
        return this.tipo === TipoCliente.PESSOA_JURIDICA;
    }
}