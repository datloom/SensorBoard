/*
gridCore.js, 2021-04-21, 西岡 芳晴 ( NISHIOKA Yoshiharu )
Gridオブジェクト処理ライブラリ
・必要とするライブラリ
　netCDF.js
　ab.js
●やること
・awaitで書き換え
・loadGridNetCDFをまじめに実装
*/
'use strict';

import { loadNetCDF } from './netCDF.js';
import * as Load from './load.js';
import * as Canvas from './canvas.js';
import * as DataPng from './dataPng.js';
import * as Projection from './projection.js';

//*** Gridオブジェクトロード ***
// 関数 loadGridText( url, option )
// テーブル型グリッドテキストファイルからGridを読み込みます．
// url: テーブル型グリッドテキストファイルのURL，必須
// option: 読み込みパラメータオブジェクト，省略可
// 戻り値: Gridを受け取るためのプロミス
// optionの構造
//   spacing: Array(2), グリッド間隔（横方向，縦方向），省略時はデータから推定
//   range: left, top, right, bottomの値持つオブジェクト
//   random: Boolean, デフォルト配置順序がランダムか
//   order: 'z'または'reverse'，デフォルト'z'，'reverse'未実装
// ヘッダ1行固定
// 無効値文字列は '-9999'に固定
// rangeの指定が無い場合は，データの先頭と末端から推定
// spacing省略時は，第1と第2データを使って横方向の間隔を求め，縦方向は同一としています．
// 幅と高さはrangeとspacingから求めています．
// *** 現状でも，z型でない場合もrangeとspaceを指定すれば利用できるはずです．
async function loadFromText( url, option ){
	const
		tsv = await Load.tsv( url, ',' ),
		grid = {};
	let
		invalid = '-9999',	// 無効値
		xcol = 0,	// グリッドデータの横方向の値を格納する列番号(0から開始）
		ycol = 1,	// グリッドデータの縦方向の値を格納する列番号(0から開始）
		vcol = 2,	// グリッド(交点)に関連付けられる値を格納する列番号(0から開始）
		rightword = true,	// X座標の正の向き，true: 右，false: 左，デフォルト 右
		downword = false,	// Y座標の正の向き，true: 下，false: 上，デフォルト上
		inOrder = false,
		minx =  Infinity,
		maxx = -Infinity,
		miny =  Infinity,
		maxy = -Infinity,
		startRow,			// データの開始行
		startX,				// 最初のデータのX座標
		startY,				// 最初のデータのY座標
		lastX,				// 最後のデータのX座標
		lastY;				// 最後のデータのY座標

	if( option ){
		inOrder = option.inOrder ?? inOrder
		rightword = option.rightword ?? rightword;
		downword  = option.downword  ?? downword;
		if( option.xyvCols !== undefined ){
			xcol = option.xyvCols[ 0 ];
			ycol = option.xyvCols[ 1 ];
			if( option.xyvCols.length > 2 ){
				vcol = option.xyvCols[ 2 ];
			}
		}
	}

	startRow = ( tsv[ 0 ].length > 2 && !isNaN( tsv[ 0 ][ xcol ] ) ) ? 0 : 1;
	startX = Number( tsv[ startRow ][ xcol ] );
	startY = Number( tsv[ startRow ][ ycol ] );
	lastX  = Number( tsv[ tsv.length - 2 ][ xcol ] );
	lastY  = Number( tsv[ tsv.length - 2 ][ ycol ] );

	// グリッド間隔( spacing )の設定
	if( option && option.spacing ){
		grid.spacing = option.spacing;
	} else {
		// 第1データと第2データの差から求め，X,Y同一とする
		const
			r0 = tsv[ startRow ],
			r1 = tsv[ startRow + 1 ],
			s0 = Math.abs( r1[ xcol ] - r0[ xcol ] || r1[ ycol ] - r0[ ycol ] );

		grid.spacing = [ s0, s0 ];
	};

	// 範囲( left, top, right, bottom )の設定
	if( option && option.range ){
		grid.left   = option.range.left;
		grid.top    = option.range.top;
		grid.right  = option.range.right;
		grid.bottom = option.range.bottom;
		rightword = 0 < grid.right  - grid.left;
		downword =  0 < grid.bottom - grid.top;
	} else {
		if( inOrder ){ 
				// 最初のレコードと最後のレコードが4四隅のいずれかで対角であると仮定
			grid.left   = Number( ( startX < lastX == rightword ) ? startX : lastX );
			grid.right  = Number( ( startX < lastX == rightword ) ? lastX  : startX );
			grid.top     = Number( ( startY < lastY == downword ) ? startY : lastY );
			grid.bottom  = Number( ( startY < lastY == downword ) ? lastY  : startY );
		} else {
			// すべてのデータを調べてx,yの最小，最大を求める．
			for( let i = startRow; i < tsv.length; i++ ){
				const
					a = tsv[ i ];

				if( a.length > 2 ){
					minx = Math.min( minx, a[ xcol ] )
					maxx = Math.max( maxx, a[ xcol ] )
					miny = Math.min( miny, a[ ycol ] )
					maxy = Math.max( maxy, a[ ycol ] )
				}
			}
			grid.right  = Number( rightword ? maxx : minx ); 
			grid.left   = Number( rightword ? minx : maxx );
			grid.top    = Number( downword  ? miny : maxy );
			grid.bottom = Number( downword  ? maxy : miny );
		}
	}

	grid.width = Math.round(
			Math.abs( grid.right - grid.left )  / grid.spacing[ 0 ] ) + 1;
	grid.height = Math.round(
			Math.abs( grid.top - grid.bottom ) / grid.spacing[ 1 ] ) + 1;
	grid.data = new Float32Array( grid.width * grid.height ).fill( NaN );
	for( let k = startRow; k < tsv.length; k++ ){
		if( tsv[ k ].length > 2 ){	// 3組以上のデータが無い場合は処理しない
			const
				v = ( tsv[ k ][ vcol ] == invalid ) ? NaN : Number( tsv[ k ][ vcol ] );
			let
				k2,
				i,
				j;

			if( inOrder ) 	{// z型及びその対称型3種のいずれかと仮定
				i = k % grid.width;
				j = ( k- i ) / grid.width;
				i = ( startX < lastX == rightword ) ? i : grid.width - i;
				j = ( startY < lastY == downword )  ? j : grid.height - j;
			} else {
				i = ( rightword ? 1 : -1 ) * ( tsv[ k ][ xcol ] - grid.left ) / grid.spacing[ 0 ];
				j = ( downword  ? 1 : -1 ) * ( tsv[ k ][ ycol ] - grid.top  ) / grid.spacing[ 1 ];
			}
			grid.data[ j * grid.width + i ] = v;
		}
	}
	return grid;
}


// 関数 loadGridNetCDF( url, northPositive )
// グリッドNetCDFファイルからGridを読み込みます．
// url: グリッドNetCDFファイル，必須
// northPositive: 標系の北向きが正ならtrue，デフォルトはtrue
//  （緯度経度座標系，平面直角座標系ともにtrueです）
// ※y_rangeの取り扱いは応急処置，テストもしていない
async function loadFromNetCDF( url, northPositive = true ){
	const
		netCDF = await loadNetCDF( url ),
		srcGrid = {};
	let
		reverse = false,
		y1, y2,
		newGrid;

	if( netCDF.gatt_array ){
		srcGrid.gatt = {};
		for( let key in netCDF.gatt_array ){
			srcGrid.gatt[ key ] = netCDF.gatt_array[ key ].valueslo
		}
	}
	netCDF.var_array.forEach( ( o, i ) => {
		if( o.name == 'dimension' ){
			srcGrid.width = netCDF.data[ i ][ 0 ];
			srcGrid.height = netCDF.data[ i ][ 1 ];
		} else if( o.name == 'z' ){
			srcGrid.data = netCDF.data[ i ];
			if( o.vattArray && o.vattArray.actual_range ){
												// GMT4標準2次元配列
				srcGrid.z_range = o.vattArray.actual_range.values;
			}
		} else if( o.name == 'elevation' ){		// GEBCO
			srcGrid.data = netCDF.data[ i ];
		} else if( o.name == 'x_range' ){
			srcGrid.x_range = netCDF.data[ i ];
		} else if( o.name == 'y_range' ){
			srcGrid.y_range = netCDF.data[ i ];
		} else if( o.name == 'z_range' ){
			srcGrid.z_range = netCDF.data[ i ];
		} else if( o.name == 'spacing' ){
			srcGrid.spacing = netCDF.data[ i ];
		} else if( o.name == 'x' ){
			srcGrid.x = netCDF.data[ i ];		// GMT4標準2次元配列
			srcGrid.x_range = o.vattArray.actual_range.values;
		} else if( o.name == 'y' ){
			srcGrid.y = netCDF.data[ i ];		// GMT4標準2次元配列
			srcGrid.y_range = o.vattArray.actual_range.values;
		} else if( o.name == 'lat' ){
			srcGrid.y = netCDF.data[ i ];		// GEBCO
		} else if( o.name == 'lon' ){
			srcGrid.x = netCDF.data[ i ];		// GEBCO
		}
	} );
	netCDF.dim_array.forEach( ( o, i ) => {
		if( o.name == 'x' ){					// GMT4標準2次元配列
			srcGrid.width = o.length;
		} else if( o.name == 'y' ){				// GMT4標準2次元配列
			srcGrid.height = o.length;
		} else if( o.name == 'lat' ){			// GEBCO
			srcGrid.height = o.length;
		} else if( o.name == 'lon' ){			// GEBCO
			srcGrid.width = o.length;
		}
	} );
	if( srcGrid.y ){
		y1 = srcGrid.y[ 0 ],
		y2 = srcGrid.y[ srcGrid.y.length - 1 ];
		reverse = ( y1 > y2 ) != northPositive;	// 排他論理和
	} else if( srcGrid.y_range ){
		y1 = srcGrid.y_range[ 0 ],
		y2 = srcGrid.y_range[ 1 ];
//			reverse = ( y1 > y2 ) != northPositive;	// 排他論理和
		// Japan250，つねにz型として実行，reverseはデフォルトのfalseに固定
	}
	newGrid =  cut( srcGrid, null, reverse );
	if( srcGrid.x ){
		newGrid.left  = srcGrid.x[ 0 ];
		newGrid.right = srcGrid.x[ srcGrid.x.length - 1 ];
	} else if( srcGrid.x_range ){
		newGrid.left  = srcGrid.x_range[ 0 ],
		newGrid.right = srcGrid.x_range[ 1 ];
	}
	if( srcGrid.y ){
		newGrid.top    = ( reverse ) ? y2 : y1;
		newGrid.bottom = ( reverse ) ? y1 : y2;
	} else if( srcGrid.y_range ) {
		// Japan250は,　常にy1<y2と解釈
		newGrid.top    = ( northPositive ) ? y2 : p1;
		newGrid.bottom = ( northPositive ) ? y1 : p2;
	}
	if( srcGrid.spacing ){
		const
			w0 = ( newGrid.right - newGrid.left ) / srcGrid.spacing[ 0 ],
			h0 = ( newGrid.top - newGrid.bottom ) / srcGrid.spacing[ 1 ];

		if( Math.round( w0 ) == srcGrid.width ){		// 中央型ならば
			newGrid.left  += srcGrid.spacing[ 0 ] / 2;
			newGrid.right -= srcGrid.spacing[ 0 ] / 2;
		};
		if( Math.round( h0 ) == srcGrid.height ){		// 中央型ならば
			newGrid.top    -= srcGrid.spacing[ 1 ] / 2;
			newGrid.bottom += srcGrid.spacing[ 1 ] / 2;
		}
	}
	return newGrid;
}

//*** Gridオブジェクト処理 ***

function cut( grid, bounds, yReverse = false ){
// gridから範囲boundsを切り出して，新しいGridオブジェクトを生成して返します．
// gridは必須
// boundsは省略するとソースの範囲と同一になります
// yReverseでY軸反転を指定できます(省略時はfalse)．
	const
		sw = grid.width,								// データソースの幅
		sh = grid.height,								// データソースの高さ
		i0 = ( bounds ) ? bounds[ 0 ] : 0,
		j0 = ( bounds ) ? bounds[ 1 ] : 0,
		width = ( bounds ) ? bounds[ 2 ] : sw,
		height = ( bounds ) ? bounds[ 3 ] : sh,
		imin = Math.max( 0, -i0 ),
		imax = Math.min( width, sw - i0 ),
		jmin = Math.max( 0, -j0 ),
		jmax = Math.min( height, sh - j0 ),
		outGrid = {
			width: width,
			height: height,
			data: new grid.data.constructor( width * height ).fill( NaN )
		}
	if( yReverse ){		// yReverse省略時はfalseになる
		for( let j = jmin; j < jmax; j++ ){
			const
				k = j * width + imin,
				iw = i0 + ( sh - 1 - ( j + j0 ) ) * sw;

			outGrid.data.set( grid.data.slice( iw + imin, iw + imax ), k );
		}
	} else {
		for( let j = jmin; j < jmax; j++ ){
			const
				k = j * width + imin,
				iw = i0 + ( j + j0 ) * sw;

			outGrid.data.set( grid.data.slice( iw + imin, iw + imax ), k );
		}
	}
	if( grid.left != undefined && grid.right != undefined 
			&& grid.top != undefined && grid.bottom != undefined){
		outGrid.left = grid.left 
				+ imin * ( grid.right - grid.left ) / ( grid.width - 1 );
		outGrid.right = grid.left 
				+ imax * ( grid.right - grid.left ) / ( grid.width - 1 );
		outGrid.top = grid.top 
				+ jmin * ( grid.bottom - grid.top ) / ( grid.height - 1 );
		outGrid.bottom = grid.top 
				+ jmax * ( grid.bottom - grid.top ) / ( grid.height - 1 );
	}
	if( grid.spacing ){
		outGrid.spacing = grid.spacing;
	}
	return outGrid
}

// gridからピラミッドタイルを生成し，タイルごとにprocessTileで指定した関数を実行します．
// processTileで指定する関数はgridとcoordsを引数に持ち，プロミスを返します．
function toTiles( grid, processTile, zmax, zmin, tileSize = 256 ){
	const
		pTileSet = [];

	( zmax == undefined ) ? zmax = 0 : '';
	( zmin == undefined ) ? zmin = zmax : '';
	for( let tz = zmin; tz <= zmax; tz++ ){
		const
			zf = 2 ** ( zmax - tz ),
			txmin = Math.floor( grid.left / tileSize / zf ),
			tymin = Math.floor( grid.top / tileSize / zf   ),
			txmax = Math.floor( grid.right / tileSize / zf  ),
			tymax = Math.floor( grid.bottom / tileSize / zf   );

		for( let ty = tymin; ty <= tymax; ty++ ){
			for( let tx = txmin; tx <= txmax; tx++ ){
				const
					tileGrid = {				// 出力するタイル用のグリッド
						width: tileSize,
						height: tileSize, 
						data: new grid.data.constructor( tileSize * tileSize )
								.fill( NaN )
					}
				let
					empty = true;

				for( let j = 0; j < tileSize; j++ ){
					for( let i = 0; i < tileSize; i++ ){
						const
							k = j * 256 + i,
							x = ( tx * 256 + i ) * zf - grid.left,
							y = ( ty * 256 + j ) * zf - grid.top;

						if( 0 <= x && x < grid.width && 0 <= y && y < grid.height ){
							const
								v = grid.data[ y * grid.width + x ];
							
							if( !isNaN( v ) ){	// v !== NaN ではテストできない
								tileGrid.data[ k ] = grid.data[ y * grid.width + x ];
								empty = false;
							}
						}
					}
				}
				if( !empty ){
					pTileSet.push( processTile( tileGrid, { x: tx, y: ty, z: tz } ) );
				}
			}
		}
	}
	return Promise.all( pTileSet )
}

//*** Grid-ImageData変換 ***

function toImageData( grid, factor, offset ){
	const
		width = grid.width,								// データソースの幅
		height = grid.height,							// データソースの高さ
		imageData = new ImageData( width, height ),
		data = imageData.data;

	factor = factor ? factor : 1;
	offset = offset ? offset : 0;
	for( let j = 0; j < height; j++ ){
		for( let i = 0; i < width; i++ ){
			const
				k = i + j * width;

			DataPng.setInt24( data, grid.data[ k ] * factor + offset, k * 4 );
		}
	}
	return imageData;
}

function fromImageData( imageData, factor = 1 , offset = 0 ){
	const
		d = imageData.data,
		gridData = new Float32Array( imageData.width * imageData.height );

	for( let i = 0; i < gridData.length; i++ ){
		gridData[ i ] = DataPng.getInt24( d, i * 4 ) * factor + offset;
	}
	return { width: imageData.width, height: imageData.height, data: gridData }
}

//*** Gridオブジェクト座標変換 ***

// latLngToWebMel
// 正距円筒図法のGridオブジェクトをウェブメルカトルのGridオブジェクトに変換します
// grid: ソースグGridオブジェクト，緯度経度範囲をleft,top,right,bottom属性で指定します．
// order: ウェブメルカトル次数（256pxのズームレベル＋8)
// bounds: 出力ウェメルカトル範囲 {x,y,width,height}　省略するとgrid範囲から求めます．
// 戻り値: Gridオブジェクト
// セルの左上端の標高値を表現します．
// 囲む4点の標高値がすべて求められるときにのみ出力します．
function latLngToWebMel( grid, order = 8, bounds = null ){
	const
		z = order - 8,
		latMax = Projection.webMelLatLimit,	// ウェブメルカトルの緯度の最高値
		incLl = {
			lat: ( grid.bottom - grid.top  ) / ( grid.height - 1 ),
			lng: ( grid.right  - grid.left ) / ( grid.width - 1 )
		},
		outGrid = { spacing: [ 1, 1 ] };
	let
		xInGrid,
		yInGrid;

	if( bounds ){
		outGrid.left   = bounds[ 0 ];
		outGrid.top    = bounds[ 1 ];
		outGrid.width  = bounds[ 2 ];
		outGrid.height = bounds[ 3 ];
		outGrid.right  = outGrid.left + outGrid.width  - 1;
		outGrid.bottom = outGrid.top  + outGrid.height - 1;
	} else {
		const
			tl = Projection.latLngToWebMel(
					{ lat: Math.min( grid.top,     latMax ), lng: grid.left  }, z + 8 ),
			br = Projection.latLngToWebMel(
					{ lat: Math.max( grid.bottom, -latMax ), lng: grid.right }, z + 8 );

		outGrid.left   = Math.ceil( tl.x );
		outGrid.top    = Math.ceil( tl.y );
		outGrid.right  = Math.floor( br.x );
		outGrid.bottom = Math.floor( br.y );
		outGrid.width  = outGrid.right  - outGrid.left + 1;
		outGrid.height = outGrid.bottom - outGrid.top  + 1;
	}
	xInGrid = new Array( outGrid.width );
	for( let i = 0; i < outGrid.width; i++ ){
		const
			lng = Projection.webMelXToLng( outGrid.left + i, z + 8 );

		xInGrid[ i ] =( lng - grid.left ) / incLl.lng;
	}
	yInGrid = new Array( outGrid.height );
	for( let j = 0; j < outGrid.height; j++ ){
		const
			lat = Projection.webMelYToLat( outGrid.top + j, z + 8 );

		yInGrid[ j ] = ( lat - grid.top ) / incLl.lat;
	};
	bilinear( grid, outGrid, 
		p => { return { x: xInGrid[ p.x ], y: yInGrid[ p.y ] } } 
	);
	return outGrid
}

// 関数 toWebMel
// 任意の座標系のグリッドデータをウェブメルカトルに変換します．
// fromWebMelが指定されていないか，affineがtrueに設定されている場合は，2分割アフィンで変換します．
function toWebMel( grid, toWebMel, fromWebMel, bounds = null, affine = false ){
	const
		srcG = [ 								// ソース矩形範囲
			[ grid.left, grid.bottom ],
			[ grid.left, grid.top ],
			[ grid.right, grid.top ],
			[ grid.right, grid.bottom ]
		].map( v => toWebMel( v[ 0 ], v[ 1 ] ) ),
		outGrid = { spacing: [ 1, 1 ] };

	if( bounds ){
		outGrid.left   = bounds[ 0 ];
		outGrid.top    = bounds[ 1 ];
		outGrid.width  = bounds[ 2 ];
		outGrid.height = bounds[ 3 ];
		outGrid.right  = outGrid.left + outGrid.width  - 1;
		outGrid.bottom = outGrid.top  + outGrid.height - 1;
	} else {
		outGrid.left   = Math.ceil(  Math.min( ...srcG.map( v => v.x ) ) );
		outGrid.top    = Math.ceil(  Math.min( ...srcG.map( v => v.y ) ) );
		outGrid.right  = Math.floor( Math.max( ...srcG.map( v => v.x ) ) );
		outGrid.bottom = Math.floor( Math.max( ...srcG.map( v => v.y ) ) );
		outGrid.width  = outGrid.right  - outGrid.left + 1;
		outGrid.height = outGrid.bottom - outGrid.top  + 1;
	}

	if( affine || !fromWebMel ){
		const
			srcW = grid.width,								// ソースの幅
			srcH = grid.height,								// ソースの高さ
			v02 = {									// ベクトルP0P2，領域2分割に使用
				x: srcG[ 2 ].x - srcG[ 0 ].x,
				y: srcG[ 2 ].y - srcG[ 0 ].y
			},
			// 変換パラメータ
		    c1 = calcParam( 
		    	[ srcG[ 2 ].x - srcG[ 1 ].x, srcG[ 2 ].y - srcG[ 1 ].y ], 
		    	[ srcG[ 0 ].x - srcG[ 1 ].x, srcG[ 0 ].y - srcG[ 1 ].y ],
		    	srcG[ 1 ],
		    	{ x: 0, y: 0 }
		    ),
		    c2 = calcParam( 
		    	[ srcG[ 3 ].x - srcG[ 0 ].x, srcG[ 3 ].y - srcG[ 0 ].y ], 
		    	[ srcG[ 3 ].x - srcG[ 2 ].x, srcG[ 3 ].y - srcG[ 2 ].y ],
		    	srcG[ 3 ],
		    	{ x: srcW + 1, y: srcH + 1 }
		    );

		// 2x2行列の逆行列を返します．
		function inverse( a ){
			const
				d = a[ 0 ] * a[ 3 ] - a[ 1 ] * a[ 2 ];	// 判別式

			return [
				 a[ 3 ] / d, -a[ 1 ] / d,
				-a[ 2 ] / d,  a[ 0 ] / d
			];
		}

		// 変換パラメータの計算
		function calcParam( vx0, vy0, srcOrg, outOrg ){
			const
				a = inverse(  [ vx0[ 0 ] / srcW, vy0[ 0 ] / srcH, 
						vx0[ 1 ] / srcW, vy0[ 1 ] / srcH ] );

	    	return  [
	    		a[ 0 ], a[ 1 ], outOrg.x - srcOrg.x * a[ 0 ] - srcOrg.y * a[ 1 ], 
	    		a[ 2 ], a[ 3 ], outOrg.y - srcOrg.x * a[ 2 ] - srcOrg.y * a[ 3 ]
	    	];
	    }

		// アフィン変換
		function affine( a, b ){
			return {           
				x: a[ 0 ] * b[ 0 ] + a[ 1 ] * b[ 1 ] + a[ 2 ],
				y: a[ 3 ] * b[ 0 ] + a[ 4 ] * b[ 1 ] + a[ 5 ]
			}
		}

		bilinear( grid, outGrid, p => {
			const
				p2 = [ outGrid.left + p.x, outGrid.top + p.y ],
				f = v02.x * ( p2[ 1 ] - srcG[ 0 ].y ) > v02.y * ( p2[ 0 ] - srcG[ 0 ].x );

			return affine( f ? c1 : c2, p2 );
		} );
	} else {
		const
			xStep = Math.sign( grid.right - grid.left ) / grid.spacing[ 0 ],
			yStep = Math.sign( grid.bottom - grid.top ) / grid.spacing[ 1 ];

		bilinear( grid, outGrid, p => {
			const
				outP = fromWebMel( outGrid.left + p.x, outGrid.top + p.y );			
															// 出力座標系

			return { x: xStep * ( outP.x - grid.left ), y: yStep * ( outP.y - grid.top ) }
															// 入力グリッドのグリッド座標
		} );
	}
	return outGrid
}

// inGridをoutGridにバイリニアー変換します
// outGridToInGrid: 座標変換関数
function bilinear( inGrid, outGrid, outGridToInGrid ){
	const
		kmax = outGrid.width * outGrid.height,
		inData = inGrid.data;						// 入力グリッドのデータ
	let
		outData;									// 出力グリッドのデータ

	outData = outGrid.data = new inGrid.data.constructor( kmax ).fill( NaN );
	for( let k = 0; k < kmax; k++ ){
		const
			i = k % outGrid.width,
			p = outGridToInGrid( { x: i, y: ( k - i ) / outGrid.width } );
								// 出力グリッド座標を入力グリッド座標に変換

			if( 0 <= p.x && p.x <= inGrid.width - 1 
				&& 0 <= p.y && p.y <= inGrid.height - 1 ){
								// ソースグリッドの範囲内のみ処理
			const
				x1 = Math.floor( p.x ),		// 左上の座標
				y1 = Math.floor( p.y ),
				y1w = y1 * inGrid.width,
				h1 = inData[ x1     + y1w ],
				h2 = inData[ x1 + 1 + y1w ],
				h3 = inData[ x1 +     y1w + inGrid.width ],
				h4 = inData[ x1 + 1 + y1w + inGrid.width ],
				s = p.x - x1,
				t = p.y - y1,
				h = ( 1 - s ) * ( 1 - t ) * h1 
						+ s * ( 1 - t ) * h2 + ( 1 - s ) * t * h3 + s * t * h4;
									// h1,h2,h3,h4のずれかがNaNの場合はhはNaN

			isNaN( h ) ? '' : outData[ k ] = h;
		}
	}
}

export { 
	loadFromText, loadFromNetCDF, cut, toTiles, toImageData, fromImageData,
	latLngToWebMel, toWebMel
}
export * from './dataPng.js';

