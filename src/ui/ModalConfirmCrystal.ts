// Boîte de dialogue de confirmation pour l'utilisation d'Iridium 🔮

export class ModalConfirmCrystal {
  private static elModal = document.getElementById('modal-confirm-crystal');
  private static elTitle = document.getElementById('crystal-confirm-title');
  private static elDesc = document.getElementById('crystal-confirm-desc');
  private static btnConfirm = document.getElementById('btn-confirm-crystal');
  private static btnCancel = document.getElementById('btn-cancel-crystal');
  private static onConfirmAction: (() => void) | null = null;
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.btnCancel?.addEventListener('click', () => {
      this.hide();
    });

    this.btnConfirm?.addEventListener('click', () => {
      const action = this.onConfirmAction;
      this.hide();
      action?.();
    });
  }

  public static show(title: string, description: string, onConfirm: () => void) {
    this.init();
    if (this.elTitle) this.elTitle.innerHTML = title;
    if (this.elDesc) this.elDesc.innerHTML = description;
    this.onConfirmAction = onConfirm;
    this.elModal?.classList.remove('hidden');
  }

  public static hide() {
    this.elModal?.classList.add('hidden');
    this.onConfirmAction = null;
  }
}
