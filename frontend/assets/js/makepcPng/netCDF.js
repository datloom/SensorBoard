/*
netCDF.js, 2021-04-05, 西岡 芳晴 ( NISHIOKA Yoshiharu )
netCDF.js(2020-08-20版，コード上は2020-08-05）を，モジュール対応ab.jsに変えたバージョンです
netCDFをロードするためのライブラリ
・必要とするライブラリ
　abl.js(2021-04-05)
●やること
・dimensionの2以上の場合のデータの分離を検討
*/

'use strict';

import { PointerView } from './abl.js';

/*
関数　loadNetCDF()
netCDFファイルをロードする関数，プロミスを返す．
*/
//export function loadNetCDF( url ){
async function loadNetCDF( url ){
	const
		pv = await PointerView.loadFromUrl( url, false ),
		netCDF = {};		// netCDFオブジェクト
	let
		aa,					// 作業業一時変数
		magik;				// 作業業一時変数，'CDF'がセットされることを想定

	// 仕様詳細の"string"の読み込み
	function readString(){
		const
			nelems = pv.readUint32(),	// 文字数
			s = pv.readStr( nelems ),
			r =  4 - nelems % 4;

		if( r != 4 ){	//パッディング処理
			pv.p += r;
		}
		return s;
	}

	// 仕様詳細の"att_array"の読み込み
	function readAttArray(){
		let
			aa = null;

		if( pv.readUint32() == 12 ){				// NC_ATTRIBUTE(=12)ならば
			const
				nelems = pv.readUint32();

			aa = {}
			for( let i = 0; i < nelems; i++ ){
				const
					s = readString(),
					nc_type = pv.readUint32(),
					nelems2 = pv.readUint32();

				aa[ s ] = { nc_type: nc_type, values: readValues( nc_type, nelems2 ) }
			}
		} else {								// gatt_array省略
			pv.p += 4
		}
		return aa;
	}

	// 仕様詳細の"values"の読み込み
	function readValues( type, num ){
		let
			v,
			r;

		switch( type ){
			case 1: 
				v = pv.readInt8( num );
				r =  4 - num % 4;
				if( r != 4 ){	//パッディング処理
					pv.p += r;
				}
				break;
			case 2: 
				v = pv.readStr( num );
				r =  4 - num % 4;
				if( r != 4 ){	//パッディング処理
					pv.p += r;
				}
				break;
			case 3: 
				// outOfMemory発生
				v = pv.readInt16( num );
				r =  ( 2 - num % 2 ) * 2;
				if( r != 4 ){	//パッディング処理
					pv.p += r;
				}
				break;
			case 4: 
				v = pv.readInt32( num );				break;
			case 5:
				v = pv.readFloat32( num );
				break;
			case 6:
				v = pv.readFloat64( num );				break;
		}
		return v;
	}


	// 仕様詳細の"magik"の読み込み
	magik = pv.readStr( 3 );					// 'CDF'
	if( magik !== 'CDF' ){						// netCDFファイルではない
		return Promise.reject();
	}
	netCDF.version = pv.readUint8();			// 仕様書の 'VERSION_BYTE'

	// 仕様詳細の"numrecs"(記録数)の読み込み ... なぜか0
	netCDF.numrecs = pv.readUint32();

	// 仕様詳細の"dim_array"の読み込み
	if( pv.readUint32() == 10 ){				// NC_DIMENSION(=10)ならば
		const
			nelems = pv.readUint32();

		netCDF.dim_array = [];
		for( let i = 0; i < nelems; i++ ){
			netCDF.dim_array[ i ] = { name: readString(), length: pv.readUint32( ) };
		}
	} else {									// dimension省略
		pv.p += 4
	}

	// 仕様詳細の"gatt_array"(=att_array)の読み込み
	aa = readAttArray();
	if( aa ){
		netCDF.gatt_array = aa;
	}

	// 仕様詳細の"var_array"の読み込み
	if( pv.readUint32() == 11 ){	// NC_VARIABLE(=11)ならば
		const
			nelems = pv.readUint32();

		netCDF.var_array = [];
		for( let i = 0; i < nelems; i++ ){		// [ var ...]
//		for( let i = 0; i < 6; i++ ){
			const
				varObj = { name: readString(), dimid: [] },	// name
				nelems2 = pv.readUint32();
			let
				aa;

//			console.log( s, nelems2 );
			for( let j = 0; j < nelems2; j++ ){	// [ dimd ...]
				varObj.dimid.push( pv.readUint32() );
//				console.log( dimid );
			}

			// 仕様詳細の"vatt_array"の読み込み
			aa = readAttArray();
			if( aa ){
				varObj.vattArray = aa;
			}

			// 仕様詳細の"nc_type", "vsize", \2begin"の読み込み
			varObj.nc_type = pv.readUint32();
			varObj.vsize = pv.readUint32();
			varObj.begin = pv.readUint32();
			netCDF.var_array.push( varObj );
//			console.log( s, nc_type, vsize, begin );
		}
	} else {	// 省略
		pv.p += 4
	}
	
	// 仕様詳細の"data"の読み込み
//		netCDF.data = [];
	netCDF.data = new Array( netCDF.var_array.length );

	netCDF.var_array.forEach( function( varObj, j ){
		let
			num = 1,
			v;

		varObj.dimid.forEach( function( id, i ){
			num *= netCDF.dim_array[ id ].length;
		} );
//			console.log( varObj.nc_type, num );
		netCDF.data[ j ] = readValues( varObj.nc_type, num );
//			netCDF.data.push( readValues( varObj.nc_type, num ) );

	} );

//	console.log( v );
//	console.log( magik, version, numrecs, nc_dimension );
//		console.log( netCDF );
//		console.log( pv.readUint8( pv.byteLength - pv.p ) );	// 残りを表示，デバッグ用

	return netCDF
}

export { loadNetCDF }
