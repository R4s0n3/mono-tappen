
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