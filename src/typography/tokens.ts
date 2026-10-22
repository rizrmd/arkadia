// Named text roles shared by every screen (HUD, Choose Your Hero, …). Sizes, spacing and effect widths are design
// pixels of the screen's reference canvas (1672 × 941 desktop, 864 × 1824 portrait); the scene scale maps them to CSS px.
// Fonts are MSDF atlases (public/typography/v2/fonts): EB Garamond Medium for body text, Cinzel SemiBold for display caps.

export type FontKey='body'|'display';
export const FONTS:Record<FontKey,{family:string;file:string;weight:number;licence:string;capHeight:number}>={
 body:{family:'EBGaramond-Medium',file:'garamond-medium.fnt',weight:500,licence:'EBGaramond-OFL.txt',capHeight:.65},
 display:{family:'Cinzel-SemiBold',file:'cinzel-semibold.fnt',weight:600,licence:'Cinzel-OFL.txt',capHeight:.7},
};

export type Rgb=number;
export interface Stroke{color:Rgb;alpha:number;width:number}
export interface Shadow{color:Rgb;alpha:number;dx:number;dy:number;softness:number}
export interface TextRole{
 font:FontKey;
 size:number;
 letterSpacing:number;
 // One colour is a solid fill; three are a vertical gradient (cap top → middle → baseline), evaluated in the shader.
 fill:Rgb|[Rgb,Rgb,Rgb];
 outline?:Stroke;
 shadow?:Shadow;
 // Optional halo, switched on per scene (setGlow) rather than always drawn.
 glow?:Stroke;
 lineHeight?:number;
 align?:'left'|'center'|'right';
 uppercase?:boolean;
}

export const IVORY=0xf3e6c6,IVORY_DIM=0xe4d8c2,GOLD=0xf6d04c,GOLD_LABEL=0xe2bd72;
export const GOLD_GRADIENT:[Rgb,Rgb,Rgb]=[0xfff4cc,0xf0c464,0xa86e26];
// Light HUD shadow: a 1.5 px drop that stays soft instead of a heavy contour.
const softShadow:Shadow={color:0x000000,alpha:.72,dx:0,dy:1.5,softness:1.6};
const snowShadow:Shadow={color:0x000000,alpha:.95,dx:0,dy:1.5,softness:3.2};
const displayShadow:Shadow={color:0x000000,alpha:.8,dx:0,dy:3,softness:4};
const darkOutline:Stroke={color:0x2a1606,alpha:.95,width:1.4};
const warmGlow:Stroke={color:0xffb347,alpha:.45,width:5};

export const ROLES={
 // Display caps: Cinzel's lower case is small caps, so "Ember Warden" sets as EMBER WARDEN with tall initials.
 'display-title':{font:'display',size:49,letterSpacing:.6,fill:GOLD_GRADIENT,outline:darkOutline,shadow:displayShadow,glow:warmGlow},
 'display-name':{font:'display',size:42.5,letterSpacing:.5,fill:GOLD_GRADIENT,outline:darkOutline,shadow:displayShadow,glow:warmGlow},
 'display-button':{font:'display',size:33,letterSpacing:.6,fill:GOLD_GRADIENT,outline:darkOutline,shadow:displayShadow,glow:warmGlow},
 // Wide-tracked label: small gold caps.
 'label-wide':{font:'display',size:19,letterSpacing:3.2,fill:GOLD_LABEL,shadow:softShadow,uppercase:true},
 // Body serif, solid ivory.
 'body-lg':{font:'body',size:25,letterSpacing:0,fill:IVORY,shadow:softShadow},
 'body':{font:'body',size:22,letterSpacing:0,fill:IVORY,shadow:softShadow},
 // Gold accent: body font, gold tint only.
 'accent':{font:'body',size:21,letterSpacing:0,fill:GOLD,shadow:softShadow},
 // Paragraph: wrapped and centred in its panel; the wrap width comes from the panel at layout time.
 'paragraph':{font:'body',size:19.5,letterSpacing:0,fill:IVORY_DIM,shadow:softShadow,lineHeight:26,align:'center'},
 // HUD.
 'hud-name':{font:'body',size:27,letterSpacing:.2,fill:IVORY,shadow:softShadow,outline:{color:0x000000,alpha:.5,width:.6}},
 'hud-value':{font:'body',size:21,letterSpacing:.2,fill:IVORY,shadow:softShadow},
 'hud-stat':{font:'body',size:26,letterSpacing:.2,fill:IVORY,shadow:softShadow},
 'hud-level':{font:'body',size:28,letterSpacing:0,fill:IVORY,shadow:softShadow},
 'hud-skill':{font:'body',size:22.5,letterSpacing:.1,fill:IVORY,shadow:snowShadow,outline:{color:0x0a0604,alpha:.7,width:1},glow:{color:0x000000,alpha:.45,width:5}},
 'hud-badge':{font:'body',size:17.5,letterSpacing:.2,fill:IVORY,shadow:softShadow},
 'hud-state':{font:'body',size:17,letterSpacing:.8,fill:0xf7e2ae,shadow:softShadow,uppercase:true},
 'hud-xp':{font:'body',size:22.5,letterSpacing:.2,fill:IVORY,shadow:softShadow},
 'hud-xp-accent':{font:'body',size:22.5,letterSpacing:.2,fill:GOLD,shadow:softShadow},
 'hud-key':{font:'body',size:19,letterSpacing:0,fill:IVORY,shadow:softShadow},
 'hud-hint':{font:'body',size:21.5,letterSpacing:.2,fill:IVORY,shadow:softShadow},
} satisfies Record<string,TextRole>;
export type RoleName=keyof typeof ROLES;
