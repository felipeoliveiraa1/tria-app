import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API - Iniciando criação de arquivo de áudio...')
    
    // Verificar variáveis de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ API - Variáveis de ambiente não configuradas')
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }
    
    console.log('✅ API - Variáveis de ambiente configuradas')
    
    // Ler o body uma única vez
    const body = await request.json()
    const { 
      consultation_id, 
      filename, 
      mime_type, 
      size, 
      duration,
      storage_path,
      storage_bucket,
      is_processed,
      processing_status,
      audio_data,
      original_blob_size
    } = body

    if (!consultation_id || !filename || !mime_type || !size) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    console.log('🔄 API - Criando arquivo de áudio:', {
      consultation_id,
      filename,
      mime_type,
      size,
      duration,
      has_audio_data: !!audio_data
    })

    try {
      // Criar cliente Supabase com cookies para autenticação
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: any) {
              cookieStore.set(name, value, options)
            },
            remove(name: string, options: any) {
              cookieStore.set(name, '', options)
            },
          },
        }
      )

      // Verificar se o usuário está autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      // Para desenvolvimento, usar um doctor_id padrão se não houver usuário autenticado
      let doctorId = 'a5a278fe-dfff-4105-9b3f-a8f515d7ced8' // ID válido que existe na tabela users
      
      if (!authError && user) {
        doctorId = user.id
        console.log('✅ API - Usuário autenticado:', user.email)
      } else {
        console.log('⚠️ API - Usuário não autenticado, usando ID padrão para desenvolvimento')
      }

      // Verificar se a consulta existe e pertence ao usuário
      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select('id, doctor_id')
        .eq('id', consultation_id)
        .eq('doctor_id', doctorId)
        .single()

      if (consultationError || !consultation) {
        console.error('❌ API - Consulta não encontrada ou não autorizada:', consultationError)
        return NextResponse.json(
          { error: 'Consulta não encontrada ou não autorizada' },
          { status: 403 }
        )
      }

      // Se temos dados de áudio, salvar no storage do Supabase
      let finalStoragePath = storage_path
      if (audio_data) {
        try {
          // Converter base64 para buffer
          const audioBuffer = Buffer.from(audio_data, 'base64')
          console.log('📁 Salvando arquivo de áudio no storage, tamanho:', audioBuffer.length, 'bytes')
          
          // Tentar salvar no storage do Supabase
          try {
            // Criar cliente com service role para bypass RLS
            const supabaseAdmin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!, // Usar service role para bypass RLS
              {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false
                }
              }
            )
            
            // Garantir que o bucket existe
            try {
              console.log('🔄 Verificando se bucket audio-files existe...')
              const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.getBucket('audio-files')
              
              if (bucketError) {
                console.log('🔄 Criando bucket audio-files...')
                const { error: createError } = await supabaseAdmin.storage.createBucket('audio-files', {
                  public: true,
                  allowedMimeTypes: ['audio/*'],
                  fileSizeLimit: 52428800 // 50MB
                })
                
                if (createError) {
                  console.warn('⚠️ Erro ao criar bucket:', createError.message)
                } else {
                  console.log('✅ Bucket audio-files criado com sucesso')
                }
              } else {
                console.log('✅ Bucket audio-files já existe')
              }
            } catch (bucketCheckError) {
              console.warn('⚠️ Erro ao verificar bucket:', bucketCheckError)
            }
            
            console.log('🎵 API - Iniciando upload para storage...')
            console.log('🎵 API - Caminho do storage:', storage_path)
            console.log('🎵 API - Tamanho do buffer:', audioBuffer.length, 'bytes')
            console.log('🎵 API - Tipo MIME:', mime_type)
            
            // Fazer upload do arquivo
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
              .from('audio-files')
              .upload(storage_path, audioBuffer, {
                contentType: mime_type,
                upsert: true
              })
            
            if (uploadError) {
              console.error('❌ Erro ao fazer upload para storage:', uploadError.message)
              throw new Error(`Erro no upload: ${uploadError.message}`)
            }
            
            console.log('✅ Upload realizado com sucesso:', uploadData)
            
            // Obter URL pública do arquivo
            const { data: urlData } = supabaseAdmin.storage
              .from('audio-files')
              .getPublicUrl(storage_path)
            
            finalStoragePath = urlData.publicUrl
            console.log('✅ Arquivo salvo no storage com sucesso:', finalStoragePath)
            console.log('✅ Tamanho do arquivo no storage:', audioBuffer.length, 'bytes')
            
          } catch (storageError) {
            console.error('❌ Erro no storage:', storageError)
            throw new Error(`Erro no storage: ${storageError}`)
          }
          
        } catch (storageError) {
          console.error('❌ Erro ao processar storage:', storageError)
          throw new Error(`Erro ao processar storage: ${storageError}`)
        }
      } else {
        console.warn('⚠️ Nenhum dado de áudio fornecido, criando arquivo sem storage')
        // Criar uma URL de placeholder válida
        finalStoragePath = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audio-files/placeholder.webm`
      }

      // Criar registro no banco de dados
      const { data: audioFile, error } = await supabase
        .from('audio_files')
        .insert({
          consultation_id,
          filename,
          mime_type,
          size,
          duration,
          storage_path: finalStoragePath,
          storage_bucket,
          is_processed,
          processing_status,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ API - Erro ao criar arquivo de áudio no Supabase:', error)
        throw new Error(`Erro Supabase: ${error.message}`)
      }

      console.log('✅ API - Arquivo de áudio criado no Supabase:', audioFile)
      return NextResponse.json({
        audioFile,
        success: true,
        source: 'supabase',
        storage_url: finalStoragePath,
        // Retornar também o base64 para reprodução direta
        audio_base64: audio_data
      })
      
    } catch (supabaseError) {
      console.error('❌ API - Erro na conexão com Supabase:', supabaseError)
      
      // Retornar erro em vez de fallback temporário
      return NextResponse.json(
        { error: `Erro Supabase: ${supabaseError instanceof Error ? supabaseError.message : 'Erro desconhecido'}` },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ API - Erro interno:', error)
    return NextResponse.json(
      { error: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}` },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Criar cliente Supabase com cookies para autenticação
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Para desenvolvimento, usar um doctor_id padrão se não houver usuário autenticado
    let doctorId = 'a5a278fe-dfff-4105-9b3f-a8f515d7ced8' // ID válido que existe na tabela users
    
    if (!authError && user) {
      doctorId = user.id
      console.log('✅ API - Usuário autenticado:', user.email)
    } else {
      console.log('⚠️ API - Usuário não autenticado, usando ID padrão para desenvolvimento')
    }

    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultation_id')
    
    console.log('🔄 API - Buscando arquivos de áudio no Supabase:', { consultationId })
    
    let query = supabase
      .from('audio_files')
      .select('*')
      .order('uploaded_at', { ascending: false })
    
    if (consultationId) {
      query = query.eq('consultation_id', consultationId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ API - Erro ao buscar arquivos de áudio no Supabase:', error)
      return NextResponse.json(
        { error: `Erro ao buscar arquivos de áudio: ${error.message}` },
        { status: 500 }
      )
    }
    
    console.log('✅ API - Arquivos de áudio encontrados no Supabase:', data?.length || 0)
    
    return NextResponse.json({ 
      audioFiles: data || [], 
      success: true,
      source: 'supabase'
    })
  } catch (error) {
    console.error('❌ API - Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}
