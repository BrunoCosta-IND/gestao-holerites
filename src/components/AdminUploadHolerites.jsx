import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Upload, 
  X, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Sun,
  Moon,
  MessageSquare,
  Crown,
  Trash2,
  Send
} from 'lucide-react'
import { supabase } from '@/lib/utils'

const AdminUploadHolerites = ({ theme, toggleTheme }) => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  // Configurações da empresa
  const [empresaConfig, setEmpresaConfig] = useState({
    nome: 'Minha Empresa Personalizada',
    corBotoes: '#ff6b35'
  })

  // Funcionalidades PRO
  const [funcionalidadesPRO, setFuncionalidadesPRO] = useState({
    webhookWhatsApp: false, // Desativado conforme teste anterior
    relatorioAssinaturas: true
  })

  // Estados do upload
  const [arquivos, setArquivos] = useState([])
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')
  const [mes, setMes] = useState('')
  const [ano, setAno] = useState('')

  // Lista de funcionários (carregada do Supabase)
  const [funcionarios, setFuncionarios] = useState([])
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false)
  const [erroFuncionarios, setErroFuncionarios] = useState('')

  const [webhookN8n, setWebhookN8n] = useState("");
  const [pdfN8n, setPdfN8n] = useState(null);
  const [n8nUploads, setN8nUploads] = useState([]);

  const BASEROW_TOKEN = 'QWD51BL7wHeIyccSLWEgWoT9JCWkdc8z';
  const TABLE_FUNCIONARIOS = '591365';
  const BASEROW_URL = 'https://api.baserow.io/api/database/rows/table/593467/?user_field_names=true';

  // Adicionar estados para feedback geral
  const [uploadFeedback, setUploadFeedback] = useState(null)

  useEffect(() => {
    // Carregar configurações do localStorage
    const configSalva = localStorage.getItem('empresaConfig')
    if (configSalva) {
      setEmpresaConfig(prev => ({ ...prev, ...JSON.parse(configSalva) }))
    }

    const funcionalidadesSalvas = localStorage.getItem('funcionalidadesPRO')
    if (funcionalidadesSalvas) {
      setFuncionalidadesPRO(JSON.parse(funcionalidadesSalvas))
    }

    // Buscar funcionários do Supabase
    const fetchFuncionarios = async () => {
      setLoadingFuncionarios(true);
      try {
        const { data, error } = await supabase
          .from('funcionarios')
          .select('*')
        if (!error && data) {
          setFuncionarios(data)
          setErroFuncionarios('')
          console.log('Total de funcionários carregados do Supabase:', data.length)
        } else {
          setFuncionarios([])
          setErroFuncionarios('Erro ao buscar funcionários: ' + (error?.message || error))
          console.log('Erro ao buscar funcionários:', error)
        }
      } catch (err) {
        setFuncionarios([])
        setErroFuncionarios('Erro ao buscar funcionários: ' + err.message)
        console.log('Erro ao buscar funcionários:', err)
      } finally {
        setLoadingFuncionarios(false);
      }
    };
    fetchFuncionarios();
  }, [])

  // Função para normalizar nomes (remover acentos, espaços, underlines, etc)
  const normalizarNome = (nome) => {
    if (!nome) return '';
    return nome
      .toUpperCase()
      .normalize('NFD')
      .replace(/\s+/g, '') // Remove todos os espaços
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^A-Z0-9]/g, '') // Remove tudo que não seja letra maiúscula ou número
      .trim();
  }

  // Função para identificar funcionário pelo nome do arquivo
  const identificarFuncionario = (nomeArquivo) => {
    // Remove a extensão .pdf
    const nomeSemExtensao = nomeArquivo.replace(/\.pdf$/i, '')
    
    // Normaliza o nome do arquivo
    const nomeArquivoNormalizado = normalizarNome(nomeSemExtensao)
    
    // Procura o funcionário com nome correspondente
    const funcionarioEncontrado = funcionarios.find(funcionario => {
      const nomeFuncionarioNormalizado = normalizarNome(funcionario.nome)
      return nomeFuncionarioNormalizado === nomeArquivoNormalizado
    })
    
    return funcionarioEncontrado
  }

  // Função para extrair mês e ano do nome do arquivo
  const extrairMesAno = (nomeArquivo) => {
    // Tenta encontrar padrões tipo _JANEIRO_2024, _01_2024, _JAN_2024, etc
    const regex = /_(\w+)[ _-](\d{4})/i
    const match = nomeArquivo.match(regex)
    if (match) {
      let mes = match[1]
      let ano = match[2]
      // Normaliza mês para maiúsculo
      mes = mes.toUpperCase()
      return { mes, ano }
    }
    return { mes: 'Desconhecido', ano: 'Desconhecido' }
  }

  // Função para extrair CPF do nome do arquivo
  function extractCPF(filename) {
    const match = filename.match(/(\d{11})/);
    return match ? match[1] : '';
  }

  // Seleção de arquivos
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    const pdfFiles = files.filter(file => file.type === 'application/pdf')
    if (pdfFiles.length !== files.length) {
      setError('Apenas arquivos PDF são aceitos')
      return
    }
    // Adiciona arquivos à lista, status pendente, nome do funcionário
    const novosArquivos = pdfFiles.map((file, idx) => {
      const cpf = extractCPF(file.name)
      let nomeFuncionario = ''
      if (cpf && funcionarios && funcionarios.length > 0) {
        const f = funcionarios.find(f => {
          const cpfBanco = (f.cpf || '').replace(/\D/g, '')
          const cpfArquivo = (cpf || '').replace(/\D/g, '')
          return cpfBanco === cpfArquivo
        })
        nomeFuncionario = f ? f.nome : ''
      }
      return {
        id: Date.now() + idx,
        file,
        nome: file.name,
        tamanho: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        cpf,
        nomeFuncionario,
        status: 'pendente',
        erro: '',
      }
    })
    setArquivos(prev => [...prev, ...novosArquivos])
    setError('')
  }

  // Remover arquivo da lista
  const removeArquivo = (id) => {
    setArquivos(prev => prev.filter(arquivo => arquivo.id !== id))
  }

  // Envio dos arquivos
  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    setUploadFeedback(null);
    if (!mes || !ano || arquivos.length === 0) {
      setError('Preencha mês, ano e selecione os arquivos PDF.');
      return;
    }
    if (arquivos.length < 1 || arquivos.length > 100) {
      setError('Selecione entre 1 e 100 arquivos PDF.');
      return;
    }
    setIsUploading(true);
    const atualizaStatus = (id, status, erro = '') => {
      setArquivos(prev => prev.map(arq => arq.id === id ? { ...arq, status, erro } : arq))
    }
    let erros = [];
    for (let i = 0; i < arquivos.length; i++) {
      const arq = arquivos[i];
      if (!arq.cpf) {
        atualizaStatus(arq.id, 'erro', 'CPF não encontrado no nome do arquivo.')
        erros.push({ nome: arq.nome, motivo: 'CPF não encontrado no nome do arquivo.' })
        continue;
      }
      try {
        const filePath = `${arq.cpf}/${ano}-${mes}-${arq.nome}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('holerites')
          .upload(filePath, arq.file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from('holerites')
          .getPublicUrl(filePath);
        const { error: dbError } = await supabase.from('holerite').insert([
          {
            cpf: arq.cpf,
            mes: Number(mes),
            ano: Number(ano),
            file_url: publicUrlData.publicUrl,
            status: 'pendente'
          }
        ]);
        if (dbError) throw dbError;
        atualizaStatus(arq.id, 'concluido')
      } catch (err) {
        atualizaStatus(arq.id, 'erro', err.message || err.description || err)
        erros.push({ nome: arq.nome, motivo: err.message || err.description || err })
      }
    }
    setIsUploading(false);
    setShowSuccess(erros.length === 0);
    if (erros.length === 0) {
      setUploadFeedback({ tipo: 'sucesso', mensagem: 'Upload concluído com sucesso! Todos os holerites foram enviados.' })
    } else {
      setUploadFeedback({ tipo: 'erro', mensagem: `Alguns arquivos não foram enviados:`, erros })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'concluido': return 'bg-green-500'
      case 'erro': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'concluido': return 'Enviado'
      case 'erro': return 'Erro'
      default: return 'Pendente'
    }
  }

  useEffect(() => {
    // ...código existente...
    const fetchHolerites = async () => {
      const { data, error } = await supabase
        .from('holerite')
        .select('*')
        .eq('cpf', dadosUsuario.cpf)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })
      console.log('CPF logado:', dadosUsuario.cpf)
      console.log('Holerites retornados:', data)
      if (!error && data) {
        setHolerites(data)
      } else {
        setHolerites([])
      }
    }
    fetchHolerites()
  }, [navigate])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin-dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Upload de Holerites</h1>
              <p className="text-sm text-muted-foreground">Enviar holerites em lote para os funcionários</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 flex flex-col items-center">
        <div className="max-w-2xl w-full">
          {/* Card de instruções */}
          <div className="mb-6">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:justify-between md:gap-8">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">Como Funciona</h3>
                  <div className="mb-2">
                    <span className="font-semibold">Identificação Automática:</span>
                    <ul className="list-disc ml-6 text-sm mt-1">
                      <li>O sistema identifica funcionários pelo <b>CPF no nome do arquivo</b>.</li>
                      <li><b>Formato obrigatório:</b> <span className="font-mono">CPF_holerite.pdf</span> (exatamente 11 dígitos, sem pontos ou traços).</li>
                      <li><b>Exemplo válido:</b> <span className="font-mono">12345678901_holerite.pdf</span></li>
                      <li>O sistema ignora letras maiúsculas/minúsculas e espaços extras.</li>
                    </ul>
                  </div>
                </div>
                <div className="flex-1 mt-4 md:mt-0">
                  <span className="font-semibold">Processo de Envio:</span>
                  <ul className="list-disc ml-6 text-sm mt-1">
                    <li>Upload seguro para o armazenamento do sistema</li>
                    <li>Controle de acesso: cada funcionário só vê seus próprios holerites</li>
                    <li>Se o CPF não for encontrado, o arquivo será marcado como erro</li>
                  </ul>
                </div>
              </div>
              <div className="mt-2">
                <div className="bg-blue-950 border border-blue-700 rounded px-4 py-2 text-blue-200 text-sm">
                  <b>Importante:</b> O nome do arquivo deve conter o CPF do funcionário (exatamente 11 números, sem pontos ou traços). Se o CPF não for encontrado, o arquivo será marcado como erro e não será enviado.
                </div>
              </div>
            </div>
          </div>
          {uploadFeedback && uploadFeedback.tipo === 'sucesso' && (
            <Alert className="bg-green-900/80 border-green-700 mb-4">
              <AlertDescription className="text-green-200">
                {uploadFeedback.mensagem}
              </AlertDescription>
            </Alert>
          )}
          {uploadFeedback && uploadFeedback.tipo === 'erro' && (
            <Alert className="bg-red-900/80 border-red-700 mb-4">
              <AlertDescription className="text-red-200">
                <div>{uploadFeedback.mensagem}</div>
                <ul className="list-disc ml-6 mt-2">
                  {uploadFeedback.erros.map((err, idx) => (
                    <li key={idx}><b>{err.nome}:</b> {err.motivo}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {erroFuncionarios && (
            <Alert className="bg-red-900/80 border-red-700 mb-4">
              <AlertDescription className="text-red-200">
                {erroFuncionarios}
              </AlertDescription>
            </Alert>
          )}
          <Card className="w-full shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Selecionar Arquivos</span>
              </CardTitle>
              <CardDescription>
                Selecione os arquivos PDF dos holerites. O sistema identificará automaticamente cada funcionário pelo CPF no nome do arquivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleUpload}>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="mes">Mês *</Label>
                    <Input
                      id="mes"
                      type="number"
                      min={1}
                      max={12}
                      placeholder="MM"
                      value={mes}
                      onChange={e => setMes(e.target.value.replace(/\D/g, '').slice(0,2))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="ano">Ano *</Label>
                    <Input
                      id="ano"
                      type="number"
                      min={2000}
                      max={2100}
                      placeholder="AAAA"
                      value={ano}
                      onChange={e => setAno(e.target.value.replace(/\D/g, '').slice(0,4))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="files">Arquivos PDF *</Label>
                  <Input
                    id="files"
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleFileSelect}
                  />
                  <p className="text-xs text-muted-foreground bg-zinc-900 rounded px-2 py-1 mt-1">
                    Selecione entre <b>1 e 100 arquivos PDF</b>. O CPF deve estar no nome do arquivo (ex: <b>12345678901_holerite.pdf</b>).
                  </p>
                </div>
                {error && (
                  <Alert className="bg-red-900/50 border-red-700">
                    <AlertDescription className="text-red-200">{error}</AlertDescription>
                  </Alert>
                )}
                {/* Lista de arquivos selecionados */}
                {arquivos.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2 flex items-center"><FileText className="w-4 h-4 mr-2" /> Arquivos Selecionados</h3>
                    <div className="space-y-2">
                      {arquivos.map(arq => (
                        <div key={arq.id} className="flex items-center justify-between bg-zinc-900 rounded px-3 py-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <span className="font-medium text-white">{arq.nome}</span>
                            <span className="text-xs text-zinc-400 ml-2">{arq.tamanho}</span>
                            <span className="text-xs text-zinc-400 ml-2">{arq.cpf ? arq.cpf : <span className="text-red-400">CPF não encontrado</span>}</span>
                            {arq.cpf && (
                              <span className="text-xs text-zinc-300 ml-2">{arq.nomeFuncionario ? arq.nomeFuncionario : <span className="text-red-400">Funcionário não encontrado</span>}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {arq.status === 'concluido' && <Badge className="bg-green-700">Enviado</Badge>}
                            {arq.status === 'pendente' && <Badge className="bg-zinc-700">Pendente</Badge>}
                            {arq.status === 'erro' && <Badge className="bg-red-700">Erro</Badge>}
                            {arq.status === 'erro' && <span className="text-xs text-red-400 ml-2">{arq.erro}</span>}
                            <Button variant="ghost" size="icon" onClick={() => removeArquivo(arq.id)} disabled={isUploading || arq.status === 'concluido'}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={isUploading || arquivos.length === 0} className="w-full py-3 text-lg font-bold rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg hover:from-blue-600 hover:to-purple-600 transition">
                  {isUploading ? 'Enviando lote...' : 'Enviar Holerites'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminUploadHolerites

