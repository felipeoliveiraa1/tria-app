import { NextRequest, NextResponse } from 'next/server'

// Função para criar cliente Supabase
const createSupabaseClient = () => {
  try {
    const { createClient } = require('@supabase/supabase-js')
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Variáveis do Supabase não configuradas')
    }
    
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  } catch (error) {
    throw new Error(`Erro ao criar cliente Supabase: ${error}`)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    // Estrutura esperada das tabelas
    const expectedTables = [
      'users',
      'patients', 
      'consultations',
      'transcriptions',
      'audio_files',
      'documents',
      'templates'
    ]
    
    // Estrutura esperada das colunas principais
    const expectedStructure = {
      users: ['id', 'email', 'name', 'is_doctor', 'created_at'],
      patients: ['id', 'doctor_id', 'name', 'email', 'phone', 'city', 'status', 'created_at'],
      consultations: ['id', 'doctor_id', 'patient_id', 'patient_name', 'consultation_type', 'status', 'created_at'],
      transcriptions: ['id', 'consultation_id', 'raw_text', 'confidence', 'created_at'],
      audio_files: ['id', 'consultation_id', 'filename', 'size', 'duration', 'created_at'],
      documents: ['id', 'consultation_id', 'title', 'type', 'created_at'],
      templates: ['id', 'user_id', 'name', 'type', 'created_at']
    }
    
    const validationResults = {
      connection: false,
      tables: {} as Record<string, any>,
      missingTables: [] as string[],
      missingColumns: {} as Record<string, string[]>,
      sampleData: {} as Record<string, any>,
      recommendations: [] as string[]
    }
    
    try {
      // Testar conexão
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (connectionError) {
        throw new Error(`Erro de conexão: ${connectionError.message}`)
      }
      
      validationResults.connection = true
      
      // Verificar cada tabela
      for (const tableName of expectedTables) {
        try {
          // Verificar se a tabela existe
          const { data: tableData, error: tableError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)
          
          if (tableError) {
            if (tableError.code === '42P01') { // Tabela não existe
              validationResults.missingTables.push(tableName)
              validationResults.tables[tableName] = { exists: false, columns: [] }
            } else {
              validationResults.tables[tableName] = { 
                exists: true, 
                error: tableError.message,
                columns: []
              }
            }
            continue
          }
          
          // Tabela existe, verificar estrutura
          const { data: columnsData, error: columnsError } = await supabase
            .rpc('get_table_columns', { table_name: tableName })
            .catch(() => ({ data: null, error: { message: 'Função get_table_columns não disponível' } }))
          
          let columns: string[] = []
          if (columnsData && !columnsError) {
            columns = columnsData.map((col: any) => col.column_name)
          } else {
            // Fallback: tentar inferir colunas dos dados
            if (tableData && tableData.length > 0) {
              columns = Object.keys(tableData[0])
            }
          }
          
          validationResults.tables[tableName] = {
            exists: true,
            columns,
            rowCount: 0
          }
          
          // Verificar colunas esperadas
          const expectedColumns = expectedStructure[tableName as keyof typeof expectedStructure] || []
          const missingColumns = expectedColumns.filter(col => !columns.includes(col))
          
          if (missingColumns.length > 0) {
            validationResults.missingColumns[tableName] = missingColumns
          }
          
          // Contar registros
          try {
            const { count, error: countError } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
            
            if (!countError && count !== null) {
              validationResults.tables[tableName].rowCount = count
            }
          } catch (countError) {
            // Ignorar erro de contagem
          }
          
          // Buscar dados de exemplo
          try {
            const { data: sampleData, error: sampleError } = await supabase
              .from(tableName)
              .select('*')
              .limit(3)
            
            if (!sampleError && sampleData) {
              validationResults.sampleData[tableName] = sampleData
            }
          } catch (sampleError) {
            // Ignorar erro de busca de dados de exemplo
          }
          
        } catch (tableError) {
          validationResults.tables[tableName] = {
            exists: false,
            error: tableError instanceof Error ? tableError.message : 'Erro desconhecido',
            columns: []
          }
        }
      }
      
      // Gerar recomendações
      if (validationResults.missingTables.length > 0) {
        validationResults.recommendations.push(
          `Execute o SQL do arquivo SUPABASE_SETUP.sql para criar as tabelas: ${validationResults.missingTables.join(', ')}`
        )
      }
      
      for (const [tableName, missingCols] of Object.entries(validationResults.missingColumns)) {
        if (missingCols.length > 0) {
          validationResults.recommendations.push(
            `Tabela ${tableName} está faltando colunas: ${missingCols.join(', ')}`
          )
        }
      }
      
      // Verificar se há dados de exemplo
      const tablesWithData = Object.entries(validationResults.tables)
        .filter(([_, info]) => info.exists && info.rowCount > 0)
        .map(([name, _]) => name)
      
      if (tablesWithData.length === 0) {
        validationResults.recommendations.push(
          'Nenhuma tabela possui dados. Execute o SQL de dados de exemplo ou crie dados manualmente.'
        )
      }
      
      // Verificar relacionamentos
      if (validationResults.tables.consultations?.exists && validationResults.tables.patients?.exists) {
        try {
          const { data: relationshipTest, error: relError } = await supabase
            .from('consultations')
            .select(`
              *,
              patients (
                id,
                name,
                email
              )
            `)
            .limit(1)
          
          if (relError) {
            validationResults.recommendations.push(
              'Relacionamento entre consultations e patients não está funcionando. Verifique as foreign keys.'
            )
          }
        } catch (relError) {
          validationResults.recommendations.push(
            'Erro ao testar relacionamentos. Verifique a estrutura das foreign keys.'
          )
        }
      }
      
      return NextResponse.json({
        success: true,
        validation: validationResults,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        validation: validationResults,
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
