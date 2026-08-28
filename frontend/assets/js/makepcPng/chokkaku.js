/* chokkaku.js, 2021-04-04, 西岡 芳晴 ( NISHIOKA Yoshiharu )
平面直角座標関連の関数群
必要とするライブラリ：
GridJS(Projection.js)
平面直角座標から緯度経度を求める部分は河瀬(2011)をもとに作成
*/

"use strict";

import * as Projection from './projection.js';

const
	a = 6378137,				// 超半径, a
	rf = 298.257222101,			// 逆扁平率, F
	m0 = 0.9999,				// 縮尺係数, m0
	n = 0.5 / (rf-0.5),			// n, 1/(2F-1)
	n15 =1.5 * n,				// 作業用 3/2n
	anh = 0.5 * a / (1+n),		// 作業用 a/2(1+n)
	nsq = n * n,				// 作業用 n^2
	ra = 2 * anh * m0 * ( 1 + nsq / 4 + nsq * nsq / 64 ),	// Ā
	jt = 5,						// 次数？
	e = [],						// ??
	beta = [],					// β
	dlt = [],					// δ
	origin = {						// 座標原点
		1:  [ 33, 129 + 30 / 60 ],
		2:  [ 33, 131 ],
		3:  [ 36, 132 + 10 / 60 ],
		4:  [ 33, 133 + 30 / 60 ],
		5:  [ 36, 134 + 20 / 60 ],
		6:  [ 36, 136 ],
		7:  [ 36, 137 + 10 / 60 ],
		8:  [ 36, 138 + 30 / 60 ],
		9:  [ 36, 139 + 50 / 60 ],
		10: [ 40, 140 + 50 / 60 ],
		11: [ 44, 140 + 15 / 60 ],
		12: [ 44, 142 + 15 / 60 ],
		13: [ 44, 144 + 15 / 60 ],
		14: [ 26, 142 ],
		15: [ 26, 127 + 30 / 60 ],
		16: [ 26, 124 ],
		17: [ 26, 131 ],
		18: [ 20, 136 ],
		19: [ 26, 154 ]
	};
let
	ep = 1,
	phi0,
	lmbd0;

for( let k = 1; k <= jt; k++ ) {
	ep *= e[ k ] = n15 / k - n;
	e[ k + jt ] = n15 / ( k + jt ) - n;
}

// 展開パラメータの事前入力
beta[ 1 ] = (1/2+(-2/3+(37/96+(-1/360-81/512*n)*n)*n)*n)*n
beta[ 2 ] = (1/48+(1/15+(-437/1440+46/105*n)*n)*n)*nsq
beta[ 3 ] = (17/480+(-37/840-209/4480*n)*n)*n*nsq
beta[ 4 ] = (4397/161280-11/504*n)*nsq*nsq
beta[ 5 ] = 4583/161280*n*nsq*nsq
dlt[ 1 ] = (2+(-2/3+(-2+(116/45+(26/45-2854/675*n)*n)*n)*n)*n)*n
dlt[ 2 ] = (7/3+(-8/5+(-227/45+(2704/315+2323/945*n)*n)*n)*n)*nsq
dlt[ 3 ] = (56/15+(-136/35+(-1262/105+73814/2835*n)*n)*n)*n*nsq
dlt[ 4 ] = (4279/630+(-332/35-399572/14175*n)*n)*nsq*nsq
dlt[ 5 ] = (4174/315-144838/6237*n)*n*nsq*nsq
dlt[ 6 ] = 601676/22275*nsq*nsq*nsq

// 該当緯度の2倍角の入力により赤道からの子午線弧長を求める関数
function Merid( phi2 ) {
	const
		s = [ 0 ],
		dc = 2 * Math.cos( phi2 ),
		t = [];
	let
		sum = 0,
		c1 = ep,
		j = jt,
		jt2 = 2 * jt;					// 作業用 2・jt

	s[ 1 ] = Math.sin( phi2 );
	for( let i = 1; i <= jt2; i++) {
		 s[ i + 1 ] = dc * s[ i ] - s[ i - 1 ] ;
		 t[ i ] = ( 1 / i - 4 * i ) * s[ i ]
	}
	while( j ) {
		let
			c2 = phi2,
			c3 = 2,
			l = j;

		while( l ) {
			const
				m =( j - l ) * 2 + 1;

			c2 += (c3 /= e[ l-- ] ) * t[ m ] + ( c3 *= e[ 2 * j - l ] ) * t[ m + 1 ] ;
		}
		sum += c1 * c1 * c2;
		c1 /= e[ j-- ]
	}
	return anh * ( sum + phi2 )
}

// 平面直角座標系の座標を緯度経度のラジアンに変換します．
// x: X座標, y: Y座標, k: 第何系か
// 戻り値:　緯度，経度を要素に持つ配列，単位はラジアン
function toRad( chokkaku ){
	const
		s2r = Math.PI / 180,											// 作業用 π/180
		xi = ( chokkaku.X + m0 * Merid( 2 * origin[ chokkaku.kei ][ 0 ] * s2r ) ) / ra,	// ε
		eta = chokkaku.Y / ra,											// η
		rad = {}														// lmbd: λ, phi: φ
	let
		xip = xi,														// ε'
		etap = eta,														// η'
		chi;															// χ

	for( let j = beta.length; --j; ){
		xip  -= beta[j] * Math.sin( 2 * j * xi ) * Math.cosh( 2 * j * eta );
		etap -= beta[j] * Math.cos( 2 * j * xi ) * Math.sinh( 2 * j * eta );
	}
	rad.phi = chi = Math.asin( Math.sin( xip ) / Math.cosh( etap ) )
	for( let j = dlt.length; --j; ) {
		rad.phi += dlt[ j ] * Math.sin( 2 * j * chi ) 
	}
	rad.lmbd = origin[ chokkaku.kei ][ 1 ] * s2r + Math.atan2( Math.sinh( etap ), Math.cos( xip ) );
	
	return rad
}

// 平面直角座標系の座標を緯度経度の度数に変換します．
// x: X座標, y: Y座標, k: 第何系か
// 戻り値:　lat, lngを属性に持つオブジェクト，単位は度
function toLatLng( chokkaku ){
	return Projection.latLngRadToDeg( toRad( chokkaku ) );
}

// 平面直角座標系の座標をウェブメルカトル座標に変換します．
// x: X座標, y: Y座標, k: 第何系か, deg: 出力次数（世界を2^deg四方で表現します，デフォルトは8）
// 戻り値: x, yを属性に持つオブジェクト
function toWebMel( chokkaku, order = 8 ){
	return Projection.latLngRadToWebMel( toRad( chokkaku ), order );
}

const
	codeA = 'A'.charCodeAt( 0 );

// 平面直角座標系のメッシュコード(2500または5000)をタイル座標に変換します．
// 戻り値は配列で，タイルX座標，タイルY座標，系，メッシュコードレベルです．
// タイル座標は，北西端を原点に，東にX軸，南にY軸をとったものです．
function codeToTile( code ){
	let
		t;

	code = code.toUpperCase();
	t = [ ( code.charCodeAt( 3 ) - codeA ) * 10 + Number( code[ 5 ] ),
			 ( code.charCodeAt( 2 ) - codeA ) * 10 + Number( code[ 4 ] ),
			 Number( code.slice( 0, 2 ) ), 5000 ];	
	if( code.length >6 ) {
		t[ 0 ] = t[ 0 ] * 2 + ( 1 & ( code[ 6 ] - 1 ) ), 
		t[ 1 ] = t[ 1 ] * 2 + ( ( code[ 6 ] - 1 ) >> 1 );
		t[ 3 ] = 2500;
	}
	return t;
}

// 平面直角座標系のタイル座標をメッシュコード(2500または5000)に変換します．
// 戻り値はメッシュコードを表す6桁ないし7ケタの文字列で，大文字です．
function tileToCode( xt, yt, k, level, lowerCase = false ){
	const
		code1 = ( '0' + k ).slice( -2 );
	let
		code2,
		code3 = '',
		xy = [ xt, yt ],
		c;

	if( level !== 5000 ){
		code3 += ( ( 1 & xt ) + ( 1 & yt ) * 2 + 1 );
		xy = xy.map( v => v >> 1 );
	}
	c = xy.map( v => String.fromCharCode( codeA + Math.floor( v / 10 ) ) );
	code2 = c[ 1 ] + c[ 0 ];
	code2 = ( lowerCase ) ? code2.toLowerCase() : code2;
	return code1 +  code2 + ( xy[ 1 ] % 10 ) + ( xy[ 0 ] % 10 ) + code3;
}

// 地図情報レベル5000/2500のメッシュコードから，区画中央の位置を平面直角座標で取得します．
// 戻り値は配列で，X座標(南北方向，メートル)，Y座標(東西方向，メートル)，系，情報レベルを要素とします．
function fromCode( code ){
	const
		tile = codeToTile( code ),
		tsize = ( tile[ 3 ] == 5000 ) ? [ 4000, 3000 ] : [ 2000, 1500 ];

	return [ 300000 - ( tile[ 1 ] + 0.5 ) * tsize[ 1 ], ( tile[ 0 ] + 0.5 ) * tsize[ 0 ] - 160000,
			 tile[ 2 ], tile[ 3 ] ];
}

export { toRad, toLatLng, toWebMel, codeToTile, tileToCode, fromCode }