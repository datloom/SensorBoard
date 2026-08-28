/* pcPng.js, 2021-07-13, 西岡 芳晴 ( NISHIOKA Yoshiharu )
点群PNGを扱うためのモジュールです．
https://gsj-seamless.jp/labs/pcpng/js/pcPng.js

・必要とするライブラリ
　listPng.js

●やること
・
*/
import { createListPng, loadListPng, loadListPngHeader, int24ToByte, byteToUint24 } from './listPng.js';

// 関数 makeFieldFormats()
// paramsをもとに点群PNG用fieldFormatsの生成
function makeFieldFormats( params ){
	const
		formats = [ {}, {} ];

	if( ( params.sizeX ?? 1 ) !== 1 ){
		formats[ 0 ].size = params.sizeX;
	}
	if( ( params.offsetX ?? 0 ) !== 0 ){
		formats[ 0 ].offset = params.offsetX;
	}
	if( ( params.factorLogX ?? 0 ) !== 0 ){
		formats[ 0 ].factor = 10 ** params.factorLogX;
	}

	if( ( params.sizeY ?? 1 ) !== 1 ){
		formats[ 1 ].size = params.sizeY;
	}
	if( ( params.offsetY ?? 0 ) !== 0 ){
		formats[ 1 ].offset = params.offsetY;
	}
	if( ( params.factorLogY ?? 0 ) !== 0 ){
		formats[ 1 ].factor = 10 ** params.factorLogY;
	}
	if( params.pcPngType == 2 ) {		// 3D点群なら
		formats.push( {} );
		if( ( params.sizeZ ?? 1 ) !== 1 ){
			formats[ 2 ].size = params.sizeZ;
		}
		if( ( params.offsetZ ?? 0 ) !== 0 ){
			formats[ 2 ].offset = params.offsetZ;
		}
		if( params.factorLogZ !== 1 ){
			formats[ 2 ].factor = 10 ** ( params.factorLogZ ?? 3 );
		}
	}
//		console.log( params );
	return formats;
}

// 関数 createPcPng()
// records, paramsをもとに点群PNGを生成
function createPcPng( records, params, fieldFormats ){
	const
		subType = byteToUint24( params.pcPngType ?? 1, params.projection ?? 1, params.projectionOption ?? 0 ),
		infoX = byteToUint24( params.sizeX ?? 1, params.offsetSizeX ?? 0, params.factorLogX ?? 0 ),
		infoY = byteToUint24( params.sizeY ?? 1, params.offsetSizeY ?? 0, params.factorLogY ?? 0 ),
		infoZ = byteToUint24( params.sizeZ ?? 1, params.offsetSizeZ ?? 0, params.factorLogZ ?? 3 ),
		offsetX = params.offsetX,
		offsetY = params.offsetY,
		otherHeader = [ subType ];				// sbuType
	let
		pcPng;

	// otherHeader生成
	otherHeader.push( infoX );					// infoX
	if( params.offsetSizeX == 1 ){				// offsetX
		otherHeader.push( offsetX );
	} else if( params.offsetSizeX == 2 ){
		otherHeader.push( Math.floor( offsetX / 2**24 ) );
		otherHeader.push( offsetX % 2**24 );
	};
	otherHeader.push( infoY );					// infoY
	if( params.offsetSizeY == 1 ){				// offsetY
		otherHeader.push( offsetY );
	} else if( params.offsetSizeY == 2 ){
		otherHeader.push( Math.floor( offsetY / 2**24 ) );
		otherHeader.push( offsetY % 2**24 );
	};
	if( params.pcPngType == 2 ) {		// 3D点群なら
		otherHeader.push( infoZ );				// infoZ
		if( params.offsetSizeZ == 1 ){			// offsetZ
			otherHeader.push( offsetZ );
		} else if( params.offsetSizeZ == 2 ){
			otherHeader.push( Math.floor( offsetZ / 2**24 ) );
			otherHeader.push( offsetZ % 2**24 );
		};
	}

	// fieldFormatsが指定されていないければparamsから生成
	if( !fieldFormats ){
		fieldFormats = makeFieldFormats( params );
	}

	pcPng = createListPng( records, fieldFormats, params.type, otherHeader );
	for( let key in params ){
		pcPng[ key ] = params[ key ];
	}
	return pcPng;
}

// 関数 loadPcPng()
// urlからPcPngをロードして返します．
// fieldFormatsには読み込むフィールドフォーマットを指定します．
//    省略すると自動生成します．
async function loadPcPng( url, fieldFormats ){
	const
		header = await loadListPngHeader( url ),
		otherHeader = header.otherHeader,
		pcPng = {										// デフォルト値
			pcPngType: 1,
			projection: 1,
			webMelOrder: 24,
			sizeX: 1,
			offsetSizeX: 0, 
			factorLogX: 0,
			offsetX: 0,
			sizeY: 1,
			offsetSizeY: 0, 
			factorLogY: 0,
			offsetY: 0,
		}
	let
		pos = 0,
		defaultFieldFormats;

	if( pos < otherHeader.length ){		// subType, 
		[ pcPng.pcPngType, pcPng.projection, pcPng.projectionOption ] 
				= int24ToByte( otherHeader[ pos++ ] );
		if( pcPng.projection == 1 ){	// ウェブメルカトルなら
			pcPng.webMelOrder = pcPng.projectionOption;
		}
	}
	if( pos < otherHeader.length ){		// infoX, offsetX
		[ pcPng.sizeX, pcPng.offsetSizeX, pcPng.factorLogX ] 
				= int24ToByte( otherHeader[ pos++ ] );
		if( pcPng.offsetSizeX == 1 ){
			pcPng.offsetX = otherHeader[ pos++ ];
		} else if( pcPng.offsetSizeX == 2 ){
			pcPng.offsetX = otherHeader[ pos++ ] * 2**24 + otherHeader[ pos++ ];
		}
	}
	if( pos < otherHeader.length ){		// infoY, offsetY
		[ pcPng.sizeY, pcPng.offsetSizeY, pcPng.factorLogY ] 
				= int24ToByte( otherHeader[ pos++ ] );
		if( pcPng.offsetSizeY == 1 ){
			pcPng.offsetY = otherHeader[ pos++ ];
		} else if( pcPng.offsetSizeY == 2 ){
			pcPng.offsetY = otherHeader[ pos++ ] * 2**24 + otherHeader[ pos++ ];
		}
	}
	if( pcPng.pcPngType == 2 ) {		// 3D点群なら
		if( pos < otherHeader.length ){		// infoZ読みこみ
			[ pcPng.sizeZ, pcPng.offsetSizeZ, pcPng.factorLogZ ] 
					= int24ToByte( otherHeader[ pos++ ] );
		} else {
			pcPng.sizeZ = 1;
			pcPng.factorLogZ = 3
		}
		if( pos < otherHeader.length ){		// offstZ読みこみ
			if( pcPng.offsetSizeZ == 1 ){
				pcPng.offsetZ = otherHeader[ pos++ ];
			} else if( pcPng.offsetSizeZ == 2 ){
				pcPng.offsetZ = otherHeader[ pos++ ] * 2**24 + otherHeader[ pos++ ];
			}
		} else {
			pcPng.offsetZ = 0;
		}
	}

	//フィールドフォーマット調整
	defaultFieldFormats = makeFieldFormats( pcPng );
	if( fieldFormats ){
		!fieldFormats[ 0 ] ? fieldFormats[ 0 ] = defaultFieldFormats[ 0 ] : '';
		!fieldFormats[ 1 ] ? fieldFormats[ 1 ] = defaultFieldFormats[ 1 ] : '';
		if( !fieldFormats[ 1 ] ){
			fieldFormats[ 1 ] = defaultFieldFormats[ 1 ];
		}
		if( pcPng.pcPngType == 2 ) {		// 3D点群なら
			!fieldFormats[ 2 ] ? fieldFormats[ 2 ] = defaultFieldFormats[ 2 ] : '';
		}
	} else {
		fieldFormats = defaultFieldFormats;
	}
	
	pcPng.records = ( await loadListPng( url, fieldFormats ) ).records;
	return pcPng;
}

export { makeFieldFormats, createPcPng, loadPcPng };
export * from './listPng.js';