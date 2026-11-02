export const copyToClipboard = async (text: string) => {
    try {
        // Modern Clipboard API
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Fallback removed - handle error
        console.error('Copy failed:', err);
        return false;
      }
}

export function calculateDamage(reason: string): number{
    let damage = 0;
   
    switch (reason) {
      case "misleading-health-advice":
        damage = 750;
        break;
  
      case "offensive-humor":
        damage = 250;
        break;
  
      case "hate-speech":
        damage = 400;
        break;
  
      case "copyright":
        damage = 1500;
        break;
  
      case "fake-news":
        damage = 600;
        break;
  
      default:
        console.warn(`Unknown report reason: ${reason}`);
        break;
    }
  
    return damage;
  
}   