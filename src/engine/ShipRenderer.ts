import { ShipSkin } from '../config';
import { Renderer } from './Renderer';

export class ShipRenderer {
  /**
   * Rendu complet d'un vaisseau pour les écrans de prévisualisation (Hangar et Menu Principal).
   * Applique le dessin vectoriel spécifique à la classe du vaisseau (Éclaireur, Chasseur, Intercepteur).
   */
  public static drawPreview(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    skin: ShipSkin,
    scaleFactor: number,
    angle: number
  ): void {
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2 + 2);
    ctx.scale(scaleFactor, scaleFactor);

    // Oscillation et inclinaison dynamique
    const hoverY = Math.sin(angle * 1.5) * 4;
    ctx.translate(0, hoverY);
    ctx.rotate(Math.sin(angle) * 0.10);

    const shipClass = skin.shipClass || 'Éclaireur';

    // Rendu selon la classe
    switch (shipClass) {
      case 'Chasseur':
        this.drawChasseurPreview(ctx, skin, angle);
        break;
      case 'Intercepteur':
        this.drawIntercepteurPreview(ctx, skin, angle);
        break;
      case 'Éclaireur':
      default:
        this.drawEclaireurPreview(ctx, skin, angle);
        break;
    }

    ctx.restore();
  }

  // =========================================================================
  // 1. CLASSE ÉCLAIREUR (Scout agile, profil delta effilé, tuyère centrale unique)
  // =========================================================================
  private static drawEclaireurPreview(ctx: CanvasRenderingContext2D, skin: ShipSkin, angle: number): void {
    if (Renderer.enableGlow) {
      ctx.shadowColor = skin.glowColor;
      ctx.shadowBlur = 10;
    }

    // 1. Tuyère & Flamme centrale unique
    const flameH = 14 + Math.sin(angle * 9) * 4;
    ctx.fillStyle = skin.primaryColor;
    ctx.beginPath();
    ctx.moveTo(-5, 26);
    ctx.lineTo(0, 26 + flameH);
    ctx.lineTo(5, 26);
    ctx.closePath();
    ctx.fill();

    // Cœur de flamme blanc
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-2, 26);
    ctx.lineTo(0, 26 + flameH * 0.6);
    ctx.lineTo(2, 26);
    ctx.closePath();
    ctx.fill();

    // 2. Coque Delta fine
    ctx.fillStyle = '#070b1e';
    ctx.strokeStyle = skin.primaryColor;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(0, -48);       // Nez effilé
    ctx.lineTo(34, 22);       // Aile droite
    ctx.lineTo(16, 16);       // Découpe
    ctx.lineTo(6, 28);        // Moteur droit
    ctx.lineTo(-6, 28);       // Moteur gauche
    ctx.lineTo(-16, 16);      // Découpe
    ctx.lineTo(-34, 22);      // Aile gauche
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Ailes intérieures fines
    ctx.fillStyle = skin.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(22, 14);
    ctx.lineTo(0, 8);
    ctx.lineTo(-22, 14);
    ctx.closePath();
    ctx.fill();

    // 4. Verrière cockpit profilée
    ctx.fillStyle = '#FFFFFF';
    if (Renderer.enableGlow) {
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(6, -10);
    ctx.lineTo(0, -4);
    ctx.lineTo(-6, -10);
    ctx.closePath();
    ctx.fill();

    // 5. Anneau d'émetteur discret
    ctx.fillStyle = skin.primaryColor;
    ctx.beginPath();
    ctx.arc(0, 14, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // 2. CLASSE CHASSEUR (Assaut lourd, canons d'ailes avancés, double tuyère)
  // =========================================================================
  private static drawChasseurPreview(ctx: CanvasRenderingContext2D, skin: ShipSkin, angle: number): void {
    if (Renderer.enableGlow) {
      ctx.shadowColor = skin.glowColor;
      ctx.shadowBlur = 12;
    }

    // 1. Double réacteurs jumeaux lourds
    const flameH = 18 + Math.sin(angle * 10) * 5;
    ctx.fillStyle = skin.secondaryColor || '#FF7700';
    for (const mx of [-16, 16]) {
      ctx.beginPath();
      ctx.moveTo(mx - 5, 26);
      ctx.lineTo(mx, 26 + flameH);
      ctx.lineTo(mx + 5, 26);
      ctx.closePath();
      ctx.fill();

      // Cœur blanc réacteur
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(mx - 2.5, 26);
      ctx.lineTo(mx, 26 + flameH * 0.65);
      ctx.lineTo(mx + 2.5, 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = skin.secondaryColor || '#FF7700';
    }

    // 2. Canons lourds montés sur les ailes (dépassent franchement vers l'avant)
    for (const cx of [-32, 32]) {
      // Fût du canon en métal sombre
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = skin.primaryColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(cx - 3.5, -34, 7, 44, 2);
      ctx.fill();
      ctx.stroke();

      // Bouche du canon avec éclat d'énergie
      ctx.fillStyle = skin.primaryColor;
      ctx.fillRect(cx - 2, -37, 4, 4);

      if (Renderer.enableGlow) {
        ctx.shadowColor = skin.primaryColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, -36, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 12;
      }
    }

    // 3. Blindage lourd de la carlingue angulaire
    ctx.fillStyle = '#0a0d24';
    ctx.strokeStyle = skin.primaryColor;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, -46);       // Nez renforcé
    ctx.lineTo(14, -28);      // Biseau avant
    ctx.lineTo(20, -18);      // Canard avant droit
    ctx.lineTo(26, -10);      // Épaule
    ctx.lineTo(46, 16);       // Aile principale lourde
    ctx.lineTo(46, 26);       // Ailette stabilisatrice d'aile
    ctx.lineTo(36, 22);       // Retour aile
    ctx.lineTo(24, 28);       // Moteur droit externe
    ctx.lineTo(9, 28);        // Moteur droit interne
    ctx.lineTo(0, 18);        // Échancrure centrale
    ctx.lineTo(-9, 28);       // Moteur gauche interne
    ctx.lineTo(-24, 28);      // Moteur gauche externe
    ctx.lineTo(-36, 22);      // Retour aile
    ctx.lineTo(-46, 26);      // Ailette stabilisatrice
    ctx.lineTo(-46, 16);      // Aile principale
    ctx.lineTo(-26, -10);     // Épaule
    ctx.lineTo(-20, -18);     // Canard avant gauche
    ctx.lineTo(-14, -28);     // Biseau avant
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Plaques de blindage secondaires
    ctx.fillStyle = skin.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(18, 6);
    ctx.lineTo(12, 18);
    ctx.lineTo(0, 12);
    ctx.lineTo(-12, 18);
    ctx.lineTo(-18, 6);
    ctx.closePath();
    ctx.fill();

    // 5. Cockpit blindé angulaire
    ctx.fillStyle = '#FFFFFF';
    if (Renderer.enableGlow) {
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(8, -16);
    ctx.lineTo(8, -8);
    ctx.lineTo(0, -4);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-8, -16);
    ctx.closePath();
    ctx.fill();

    // 6. Lignes d'armement gravées
    ctx.strokeStyle = skin.primaryColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, -26);
    ctx.lineTo(24, 8);
    ctx.moveTo(-14, -26);
    ctx.lineTo(-24, 8);
    ctx.stroke();
  }

  // =========================================================================
  // 3. CLASSE INTERCEPTEUR (Apex quantique, ailes flèche inversée, proue double)
  // =========================================================================
  private static drawIntercepteurPreview(ctx: CanvasRenderingContext2D, skin: ShipSkin, angle: number): void {
    if (Renderer.enableGlow) {
      ctx.shadowColor = skin.glowColor;
      ctx.shadowBlur = 16;
    }

    // 1. Triple propulsion ionique vectorielle (Gauche, Centre, Droite)
    const flameH = 20 + Math.sin(angle * 12) * 6;
    
    // Flammes latérales
    ctx.fillStyle = skin.secondaryColor || '#00F0FF';
    for (const rx of [-22, 22]) {
      ctx.beginPath();
      ctx.moveTo(rx - 4, 20);
      ctx.lineTo(rx, 20 + flameH * 0.85);
      ctx.lineTo(rx + 4, 20);
      ctx.closePath();
      ctx.fill();
    }

    // Hyper-flamme centrale
    ctx.fillStyle = skin.primaryColor;
    ctx.beginPath();
    ctx.moveTo(-6, 26);
    ctx.lineTo(0, 26 + flameH * 1.3);
    ctx.lineTo(6, 26);
    ctx.closePath();
    ctx.fill();

    // Cœur blanc central
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-2.5, 26);
    ctx.lineTo(0, 26 + flameH * 0.8);
    ctx.lineTo(2.5, 26);
    ctx.closePath();
    ctx.fill();

    // 2. Carlingue Apex : Ailes en flèche inversée tranchantes + double proue frontale
    ctx.fillStyle = '#050718';
    ctx.strokeStyle = skin.primaryColor;
    ctx.lineWidth = 2.8;

    ctx.beginPath();
    // Éperon frontal gauche
    ctx.moveTo(-10, -52);
    ctx.lineTo(-4, -52);
    ctx.lineTo(-1, -26);      // Creux central où pulse le noyau quantique
    ctx.lineTo(1, -26);
    // Éperon frontal droit
    ctx.lineTo(4, -52);
    ctx.lineTo(10, -52);
    ctx.lineTo(16, -24);      // Épaule aérodynamique
    ctx.lineTo(32, -14);      // Racine d'aile
    ctx.lineTo(54, -20);      // Pointe extrême aile avant inversée (tranchant supérieur)
    ctx.lineTo(48, 14);       // Bord d'aile arrière
    ctx.lineTo(34, 10);       // Biseau réacteur externe
    ctx.lineTo(28, 22);       // Moteur latéral droit
    ctx.lineTo(16, 18);
    ctx.lineTo(9, 28);        // Moteur central
    ctx.lineTo(-9, 28);
    ctx.lineTo(-16, 18);
    ctx.lineTo(-28, 22);      // Moteur latéral gauche
    ctx.lineTo(-34, 10);
    ctx.lineTo(-48, 14);
    ctx.lineTo(-54, -20);     // Pointe extrême aile gauche inversée
    ctx.lineTo(-32, -14);
    ctx.lineTo(-16, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Lames d'énergie plasma sur les ailes inversées
    ctx.fillStyle = skin.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(34, -10);
    ctx.lineTo(52, -16);
    ctx.lineTo(44, 8);
    ctx.lineTo(26, 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-34, -10);
    ctx.lineTo(-52, -16);
    ctx.lineTo(-44, 8);
    ctx.lineTo(-26, 4);
    ctx.closePath();
    ctx.fill();

    // 4. Lignes de flux plasma lumineux le long des ailes
    ctx.strokeStyle = skin.glowColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(8, -48);
    ctx.lineTo(18, -20);
    ctx.lineTo(50, -18);
    ctx.moveTo(-8, -48);
    ctx.lineTo(-18, -20);
    ctx.lineTo(-50, -18);
    ctx.stroke();

    // 5. Noyau Quantique Central Pulsant (entre les deux proues)
    const corePulse = 3.5 + Math.sin(angle * 8) * 1.5;
    ctx.fillStyle = '#FFFFFF';
    if (Renderer.enableGlow) {
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(0, -26, corePulse, 0, Math.PI * 2);
    ctx.fill();

    // Halo d'énergie quantique circulaire
    ctx.strokeStyle = skin.primaryColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -26, corePulse * 1.8, 0, Math.PI * 2);
    ctx.stroke();

    // 6. Cockpit stealth en diamant noir et cristal
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(7, -4);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, -4);
    ctx.closePath();
    ctx.fill();
  }

  // =========================================================================
  // 4. RENDU EN VOL (Gameplay / Fleet.ts)
  // =========================================================================
  public static drawInFlight(
    ctx: CanvasRenderingContext2D,
    skin: ShipSkin,
    isLeader: boolean,
    flamePhase: number,
    theme: { flame: string; glow: string }
  ): void {
    const shipClass = skin.shipClass || 'Éclaireur';

    switch (shipClass) {
      case 'Chasseur':
        this.drawChasseurInFlight(ctx, skin, isLeader, flamePhase, theme);
        break;
      case 'Intercepteur':
        this.drawIntercepteurInFlight(ctx, skin, isLeader, flamePhase, theme);
        break;
      case 'Éclaireur':
      default:
        this.drawEclaireurInFlight(ctx, skin, isLeader, flamePhase, theme);
        break;
    }
  }

  private static drawEclaireurInFlight(
    ctx: CanvasRenderingContext2D,
    skin: ShipSkin,
    isLeader: boolean,
    flamePhase: number,
    theme: { flame: string; glow: string }
  ): void {
    // Propulsion centrale
    ctx.fillStyle = skin.primaryColor || theme.flame;
    const flameH = 10 + Math.sin(flamePhase * 8) * 4;
    ctx.beginPath();
    ctx.moveTo(-4, 14);
    ctx.lineTo(0, 14 + flameH);
    ctx.lineTo(4, 14);
    ctx.closePath();
    ctx.fill();

    // Fuselage Delta
    const shipGrad = ctx.createLinearGradient(0, -20, 0, 16);
    shipGrad.addColorStop(0, '#FFFFFF');
    shipGrad.addColorStop(0.35, skin.primaryColor);
    shipGrad.addColorStop(0.8, skin.secondaryColor);
    shipGrad.addColorStop(1, '#050a18');

    ctx.fillStyle = shipGrad;
    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.lineTo(16, 12);
    ctx.lineTo(8, 14);
    ctx.lineTo(0, 9);
    ctx.lineTo(-8, 14);
    ctx.lineTo(-16, 12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Cockpit
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(3.5, -3);
    ctx.lineTo(0, 0);
    ctx.lineTo(-3.5, -3);
    ctx.closePath();
    ctx.fill();
  }

  private static drawChasseurInFlight(
    ctx: CanvasRenderingContext2D,
    skin: ShipSkin,
    isLeader: boolean,
    flamePhase: number,
    theme: { flame: string; glow: string }
  ): void {
    // Double réacteurs jumeaux
    const flameH = 12 + Math.sin(flamePhase * 9) * 4;
    ctx.fillStyle = skin.secondaryColor || '#FF8800';
    for (const mx of [-8, 8]) {
      ctx.beginPath();
      ctx.moveTo(mx - 3, 14);
      ctx.lineTo(mx, 14 + flameH);
      ctx.lineTo(mx + 3, 14);
      ctx.closePath();
      ctx.fill();
    }

    // Canons d'ailes lourds
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = skin.primaryColor;
    ctx.lineWidth = 1.2;
    for (const cx of [-16, 16]) {
      ctx.fillRect(cx - 2, -18, 4, 24);
      ctx.strokeRect(cx - 2, -18, 4, 24);
      ctx.fillStyle = skin.primaryColor;
      ctx.fillRect(cx - 1, -20, 2, 3);
      ctx.fillStyle = '#0f172a';
    }

    // Fuselage lourd angulaire
    const shipGrad = ctx.createLinearGradient(0, -22, 0, 16);
    shipGrad.addColorStop(0, '#FFFFFF');
    shipGrad.addColorStop(0.3, skin.primaryColor);
    shipGrad.addColorStop(0.8, skin.secondaryColor);
    shipGrad.addColorStop(1, '#070b1e');

    ctx.fillStyle = shipGrad;
    ctx.beginPath();
    ctx.moveTo(0, -21);       // Nez
    ctx.lineTo(8, -12);       // Biseau
    ctx.lineTo(12, -7);       // Canard
    ctx.lineTo(22, 8);        // Aile lourde
    ctx.lineTo(22, 14);       // Aileron
    ctx.lineTo(12, 13);
    ctx.lineTo(5, 15);
    ctx.lineTo(0, 10);
    ctx.lineTo(-5, 15);
    ctx.lineTo(-12, 13);
    ctx.lineTo(-22, 14);
    ctx.lineTo(-22, 8);
    ctx.lineTo(-12, -7);
    ctx.lineTo(-8, -12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Cockpit blindé
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(4.5, -6);
    ctx.lineTo(0, -2);
    ctx.lineTo(-4.5, -6);
    ctx.closePath();
    ctx.fill();
  }

  private static drawIntercepteurInFlight(
    ctx: CanvasRenderingContext2D,
    skin: ShipSkin,
    isLeader: boolean,
    flamePhase: number,
    theme: { flame: string; glow: string }
  ): void {
    // Triple propulsion
    const flameH = 14 + Math.sin(flamePhase * 11) * 5;
    ctx.fillStyle = skin.secondaryColor || '#00F0FF';
    for (const rx of [-11, 11]) {
      ctx.beginPath();
      ctx.moveTo(rx - 2.5, 12);
      ctx.lineTo(rx, 12 + flameH * 0.7);
      ctx.lineTo(rx + 2.5, 12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = skin.primaryColor;
    ctx.beginPath();
    ctx.moveTo(-3.5, 14);
    ctx.lineTo(0, 14 + flameH * 1.15);
    ctx.lineTo(3.5, 14);
    ctx.closePath();
    ctx.fill();

    // Carlingue Ailes Forward-Swept + Double Pointe Frontale
    const shipGrad = ctx.createLinearGradient(0, -24, 0, 16);
    shipGrad.addColorStop(0, '#FFFFFF');
    shipGrad.addColorStop(0.25, skin.primaryColor);
    shipGrad.addColorStop(0.7, skin.secondaryColor);
    shipGrad.addColorStop(1, '#030514');

    ctx.fillStyle = shipGrad;
    ctx.beginPath();
    ctx.moveTo(-5, -24);      // Éperon gauche
    ctx.lineTo(-2, -24);
    ctx.lineTo(0, -12);       // Creux central
    ctx.lineTo(2, -24);
    ctx.lineTo(5, -24);       // Éperon droit
    ctx.lineTo(8, -10);
    ctx.lineTo(16, -6);
    ctx.lineTo(26, -10);      // Pointe aile inversée avant
    ctx.lineTo(23, 7);        // Bord arrière
    ctx.lineTo(14, 13);
    ctx.lineTo(5, 15);
    ctx.lineTo(0, 12);
    ctx.lineTo(-5, 15);
    ctx.lineTo(-14, 13);
    ctx.lineTo(-23, 7);
    ctx.lineTo(-26, -10);     // Pointe aile inversée gauche
    ctx.lineTo(-16, -6);
    ctx.lineTo(-8, -10);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Lignes de flux plasma d'ailes
    ctx.strokeStyle = skin.glowColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(3, -20);
    ctx.lineTo(8, -8);
    ctx.lineTo(24, -9);
    ctx.moveTo(-3, -20);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-24, -9);
    ctx.stroke();

    // Noyau quantique central
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, -12, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
