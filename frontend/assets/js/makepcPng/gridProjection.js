/*
gridProjection.js, 2021-04-03, 西岡 芳晴 ( NISHIOKA Yoshiharu )
・必要とするライブラリ
STools(coords)
gridCore.js
chokkaku.js
geodessy(utm.js)
*/
'use strict';

import { toWebMel } from './gridCore.js';
import * as Chokkaku from './chokkaku.js'
import * as Utm from './utm.js';

export * from './gridCore.js';

// 関数　chokkakuGridToWebMel
// 平面直角座標のグリッドをウェブメルカトル座標に変換します
// 2分割アフィン変換
// grid: 平面直角座標系Gridオブジェクト，	kei: 平面直角座標系の係数
// order: ウェブメルカトル次数（256pxのズームレベル＋8)
function chokkakuToWebMel( grid, kei, order = 8, bounds = null, 
		affine = false ){

	return toWebMel( grid,
		( x, y ) => Chokkaku.toWebMel( { Y:x, X:y, kei: kei }, order ),
		null, bounds, affine
	)
}

// 関数　utmGridToWebMel
// UTM座標のグリッドをウェブメルカトル座標に変換します
// 2分割アフィン変換
// grid: 平面直角座標系Gridオブジェクト，zone: ゾーン
// order: ウェブメルカトル次数（256pxのズームレベル＋8)
function utmToWebMel( grid, zone, hemisphere = 'N', order = 8,
		bounds = null, affine = false ){

	return toWebMel( grid, 
		( x, y ) => Utm.toWebMel( { x: x, y: y, zone: zone, heimisphere: hemisphere }, order ),
		( x, y ) => Utm.fromWebMel( { x: x, y: y, order: order } ),
		bounds, affine
	)
}

export { chokkakuToWebMel, utmToWebMel };
