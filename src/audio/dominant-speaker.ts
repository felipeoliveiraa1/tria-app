// Arbiter de Dominância de Falante (floor control)
export type SpeakerRole = 'doctor' | 'patient';

export class DominantSpeakerArbiter {
  private state = {
    doctor: { active: false, rms: 0, t: 0 },
    patient: { active: false, rms: 0, t: 0 },
  };
  private current: SpeakerRole | null = null;
  private holdUntil = 0;

  private params = {
    holdMs: 900,        // Tempo de "hold" após ativação
    overrideMs: 220,    // Tempo mínimo para override
    switchFactor: 1.9,  // Fator de RMS para troca
  };

  update(role: SpeakerRole, active: boolean, rms: number, now = performance.now()) {
    const s = this.state[role];
    s.active = active; 
    s.rms = rms; 
    s.t = now;

    const other: SpeakerRole = role === 'doctor' ? 'patient' : 'doctor';
    const me = this.state[role];
    const ot = this.state[other];

    // Se ninguém no floor ainda:
    if (this.current === null) {
      if (me.active && !ot.active) {
        this.take(role, now);
      } else if (me.active && ot.active) {
        if (me.rms >= ot.rms * this.params.switchFactor) {
          this.take(role, now);
        }
      }
      return;
    }

    // Se já tenho floor
    if (this.current === role) {
      // mantém se estou ativo; ao soltar e o outro ficar ativo, cede após hold
      if (!me.active && ot.active && now > this.holdUntil) {
        this.take(other, now);
      }
      return;
    }

    // Outro tem o floor -> só pego se posso override
    if (me.active && now > this.holdUntil) {
      if (me.rms >= ot.rms * this.params.switchFactor &&
          (now - ot.t) >= this.params.overrideMs) {
        this.take(role, now);
      }
    }
  }

  private take(role: SpeakerRole, now: number) {
    this.current = role;
    this.holdUntil = now + this.params.holdMs;
    console.log(`🎤 [Arbiter] ${role} tomou o floor até ${this.holdUntil.toFixed(0)}ms`);
  }

  canSend(role: SpeakerRole): boolean {
    const canSend = this.current === role;
    if (canSend) {
      console.log(`✅ [Arbiter] ${role} pode enviar (floor holder)`);
    } else {
      console.log(`🚫 [Arbiter] ${role} bloqueado (floor: ${this.current})`);
    }
    return canSend;
  }

  getCurrentSpeaker(): SpeakerRole | null {
    return this.current;
  }

  getHoldTimeRemaining(): number {
    if (this.current === null) return 0;
    return Math.max(0, this.holdUntil - performance.now());
  }

  getDebugInfo() {
    return {
      current: this.current,
      holdRemaining: this.getHoldTimeRemaining(),
      doctor: { ...this.state.doctor },
      patient: { ...this.state.patient },
      params: { ...this.params }
    };
  }
}

