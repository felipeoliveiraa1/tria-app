"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Table,
  Columns,
  Link,
  Settings
} from "lucide-react"

interface ValidationResult {
  connection: boolean
  tables: Record<string, any>
  missingTables: string[]
  missingColumns: Record<string, string[]>
  sampleData: Record<string, any>
  recommendations: string[]
}

export default function ValidateDatabasePage() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateDatabase = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/validate-database')
      const data = await response.json()
      
      if (data.success) {
        setValidationResult(data.validation)
      } else {
        setError(data.error || 'Erro ao validar banco de dados')
      }
    } catch (err) {
      setError('Erro de conexão com a API')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    validateDatabase()
  }, [])

  const getTableStatusIcon = (tableName: string) => {
    if (!validationResult?.tables[tableName]) return <XCircle className="h-5 w-5 text-red-500" />
    
    const table = validationResult.tables[tableName]
    if (table.exists) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getTableStatusBadge = (tableName: string) => {
    if (!validationResult?.tables[tableName]) return <Badge variant="destructive">Não Existe</Badge>
    
    const table = validationResult.tables[tableName]
    if (table.exists) {
      if (table.rowCount > 0) {
        return <Badge variant="default">OK ({table.rowCount} registros)</Badge>
      } else {
        return <Badge variant="secondary">Vazia</Badge>
      }
    } else {
      return <Badge variant="destructive">Não Existe</Badge>
    }
  }

  const getConnectionStatus = () => {
    if (!validationResult) return null
    
    if (validationResult.connection) {
      return (
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-semibold">Conectado ao Supabase</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center space-x-2 text-red-600">
          <XCircle className="h-5 w-5" />
          <span className="font-semibold">Falha na conexão</span>
        </div>
      )
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <XCircle className="h-6 w-6" />
              <span>Erro na Validação</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={validateDatabase} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Validação do Banco de Dados</h1>
          <p className="text-muted-foreground">
            Verifique a estrutura e conectividade do Supabase
          </p>
        </div>
        <Button 
          onClick={validateDatabase} 
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Validando...' : 'Revalidar'}
        </Button>
      </div>

      {/* Status da Conexão */}
      {validationResult && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-700">
              <Database className="h-6 w-6" />
              <span>Status da Conexão</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getConnectionStatus()}
          </CardContent>
        </Card>
      )}

      {/* Resultados da Validação */}
      {validationResult && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="tables">Tabelas</TabsTrigger>
            <TabsTrigger value="data">Dados</TabsTrigger>
            <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Table className="h-5 w-5" />
                  <span>Resumo das Tabelas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['users', 'patients', 'consultations', 'transcriptions', 'audio_files', 'documents', 'templates'].map((tableName) => (
                    <div key={tableName} className="text-center p-4 border rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        {getTableStatusIcon(tableName)}
                      </div>
                      <p className="font-semibold capitalize">{tableName.replace('_', ' ')}</p>
                      {getTableStatusBadge(tableName)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Estatísticas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {Object.values(validationResult.tables).filter(t => t.exists).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Tabelas Existentes</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {validationResult.missingTables.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Tabelas Faltando</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {Object.values(validationResult.tables).filter(t => t.exists && t.rowCount > 0).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Tabelas com Dados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tabelas */}
          <TabsContent value="tables" className="space-y-6">
            {['users', 'patients', 'consultations', 'transcriptions', 'audio_files', 'documents', 'templates'].map((tableName) => {
              const table = validationResult.tables[tableName]
              if (!table) return null

              return (
                <Card key={tableName}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {getTableStatusIcon(tableName)}
                      <span className="capitalize">{tableName.replace('_', ' ')}</span>
                      {getTableStatusBadge(tableName)}
                    </CardTitle>
                    <CardDescription>
                      Estrutura e status da tabela {tableName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {table.exists ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Colunas:</p>
                          <div className="flex flex-wrap gap-2">
                            {table.columns.map((column: string) => (
                              <Badge key={column} variant="outline" className="text-xs">
                                {column}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {validationResult.missingColumns[tableName] && (
                          <div>
                            <p className="text-sm font-medium text-yellow-600 mb-2">Colunas Faltando:</p>
                            <div className="flex flex-wrap gap-2">
                              {validationResult.missingColumns[tableName].map((column: string) => (
                                <Badge key={column} variant="destructive" className="text-xs">
                                  {column}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="text-sm text-muted-foreground">
                          Registros: {table.rowCount || 0}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                        <p className="text-red-600">Tabela não existe</p>
                        {table.error && (
                          <p className="text-sm text-red-500 mt-2">{table.error}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          {/* Dados */}
          <TabsContent value="data" className="space-y-6">
            {Object.entries(validationResult.sampleData).map(([tableName, data]) => (
              <Card key={tableName}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span className="capitalize">{tableName.replace('_', ' ')} - Dados de Exemplo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.map((row: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <pre className="text-sm overflow-x-auto">
                          {JSON.stringify(row, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {Object.keys(validationResult.sampleData).length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum dado de exemplo disponível</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recomendações */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Recomendações de Configuração</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validationResult.recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {validationResult.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-yellow-800">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-green-600 font-semibold">Banco de dados configurado corretamente!</p>
                    <p className="text-muted-foreground mt-2">
                      Todas as tabelas estão presentes e com a estrutura correta.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Validando banco de dados...</p>
        </div>
      )}
    </div>
  )
}
