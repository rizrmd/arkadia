// Published recipes shared by Pixi previews and atomic transactions.
export function coreUpgradeRecipe(completedLevel:number){
 if(!Number.isInteger(completedLevel)||completedLevel<1||completedLevel>30)throw Error('Invalid completed Core level');
 if(completedLevel===30)return null;
 return {level:completedLevel+1,gold:Math.ceil(300*1.25**completedLevel),wood:Math.ceil(150*1.25**completedLevel),minutes:Math.ceil(5*1.2**completedLevel)};
}
export function farmRecipe(completedLevel:number){
 if(!Number.isInteger(completedLevel)||completedLevel<0||completedLevel>30)throw Error('Invalid completed Farm level');
 if(completedLevel===30)return null;
 const level=completedLevel+1;
 return {level,operation:completedLevel===0?'Build':'Upgrade',gold:Math.ceil(150*1.25**completedLevel),wood:Math.ceil(100*1.25**completedLevel),minutes:Math.ceil(3*1.2**completedLevel),requiredCore:level};
}
export function lumberRecipe(completedLevel:number){
 if(!Number.isInteger(completedLevel)||completedLevel<0||completedLevel>30)throw Error('Invalid completed Lumber Mill level');
 if(completedLevel===30)return null;
 const level=completedLevel+1;
 return {level,operation:completedLevel===0?'Build':'Upgrade',gold:Math.ceil(75*1.25**completedLevel),wood:Math.ceil(40*1.25**completedLevel),minutes:Math.ceil(1.2**completedLevel),requiredCore:level};
}
export function kitchenRecipe(completedLevel:number){
 if(!Number.isInteger(completedLevel)||completedLevel<0||completedLevel>30)throw Error('Invalid completed Kitchen level');
 if(completedLevel===30)return null;
 const level=completedLevel+1;
 return {level,operation:completedLevel===0?'Build':'Upgrade',gold:Math.ceil(75*1.25**completedLevel),wood:Math.ceil(40*1.25**completedLevel),minutes:Math.ceil(1*1.2**completedLevel),requiredCore:level};
}
export function wallsRecipe(completedLevel:number){
 if(!Number.isInteger(completedLevel)||completedLevel<0||completedLevel>30)throw Error('Invalid completed Walls level');
 if(completedLevel===30)return null;
 const level=completedLevel+1;
 return {level,operation:completedLevel===0?'Build':'Upgrade',gold:Math.ceil(25*1.25**completedLevel),wood:Math.ceil(30*1.25**completedLevel),minutes:Math.ceil(1*1.2**completedLevel),requiredCore:level};
}
export function mineRecipe(completedLevel:number){
 if(!Number.isInteger(completedLevel)||completedLevel<0||completedLevel>30)throw Error('Invalid completed Mine level');
 if(completedLevel===30)return null;
 const level=completedLevel+1;
 return {level,operation:completedLevel===0?'Build':'Upgrade',gold:Math.ceil(150*1.25**completedLevel),wood:Math.ceil(100*1.25**completedLevel),minutes:Math.ceil(3*1.2**completedLevel),requiredCore:level};
}
