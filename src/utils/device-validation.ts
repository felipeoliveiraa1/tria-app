// Validação de dispositivos para evitar mistura de sinais
export async function assertDistinctDevices(docId: string, patId: string): Promise<boolean> {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const d = devs.find(x => x.deviceId === docId);
    const p = devs.find(x => x.deviceId === patId);
    
    if (!d || !p) {
      console.warn('[TRIA] Dispositivos não encontrados');
      return false;
    }
    
    // Se groupId for igual, o SO pode estar espelhando o mesmo sinal
    if (d.groupId && p.groupId && d.groupId === p.groupId) {
      console.warn('[TRIA] Ambos os mics têm o MESMO groupId:', d.groupId, d, p);
      
      // Exibir alerta na UI
      const message = `Atenção: seus dois microfones pertencem ao mesmo grupo de hardware/continuidade.
      
Escolha dois dispositivos físicos distintos (ex.: USB + embutido) para evitar mistura.

Médico: ${d.label || d.deviceId}
Paciente: ${p.label || p.deviceId}
GroupId: ${d.groupId}`;
      
      alert(message);
      return false;
    }
    
    console.log('[TRIA] Dispositivos validados como distintos:', {
      doctor: { label: d.label, groupId: d.groupId },
      patient: { label: p.label, groupId: p.groupId }
    });
    
    return true;
  } catch (error) {
    console.error('[TRIA] Erro ao validar dispositivos:', error);
    return false;
  }
}

