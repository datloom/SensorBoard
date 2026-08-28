/* listPng.js, 2021-08-04, 西岡 芳晴 ( NISHIOKA Yoshiharu )
リストPNGを扱うためのモジュールです．
https://gsj-seamless.jp/labs/pcpng/js/listPng.js
2021-06-22に，offsetの符号を反転

・必要とするライブラリ
　( GridJS ) canvas.js, dataPng.js

●やること
・
*/
import * as Canvas from './canvas.js';
import * as DataPng from './dataPng.js';

// yyyymmdd形式の年月日を表す文字列を，UNIX時間の日数に換算
function yyyymmddToUnixDate( s ){
	const
		d = new Date( s.slice( 0, 4 ), s.slice( 4, 6 ) - 1, s.slice( 6, 8 ) );

	return d.getTime() / 1000/ 60 / 60 / 24 - d.getTimezoneOffset() / 60 / 24;
}

// hhmmdd形式の時刻を表す文字列を，0時0分0秒からの経過秒数に変換
function hhmmssToTime( s ){
	return s.slice( 0, 2 ) * 3600 + s.slice( 2, 4 ) * 60　+ Number( s.slice( 4, 6 ) );
}

//// リストデータからの変換

// 列の並び替え，日付と時刻を変形，無効値処理
function convertList( list, convertFormats ){
	if( convertFormats == undefined ){
		convertFormats = [ ...Array( list[ 0 ].length ) ].map( ( _, i ) => { return { name : i } } );
	}
	if( list.slice( -1 )[ 0 ].length < 2 ){	// 最後の行が空白行なら削除
		list.pop();	
	}
	return  list.map( ( line, i ) => {
		return convertFormats.map( ( format ) => {
			const
				s = line[ format.name ];
			let
				v;
			
			switch( format.format ){
				case 'yyyymmdd':	// 日付
					v = yyyymmddToUnixDate( s );
					break;
				case 'hhmmss':		// 一日の中の時刻
					v = hhmmssToTime( s );
					break;
				default:
					v = isNaN( s ) ? s : Number( s );
			}
			// 無効値処理
			if( format.invalid !== undefined && v == format.invalid ){
				v = NaN;
			}
			return v
		} )
	} );
}

function createListPng( listData, fieldFormats, type = 0, otherHeader = [] ){
	fieldFormats = fieldFormats ?? Array( listData[ 0 ].length ).fill( {} );
	return {
		type: type,								// type, 1: 2D
		headerLength: 5 + otherHeader.length,
		recordLength: fieldFormats.reduce( ( acc, cur ) => acc += cur.size ?? 1, 0 ),
		otherHeader: otherHeader,
		fieldFormats: fieldFormats,
		records: listData
	};
}


//// 出力関連
function defaultRecordWriter( buf, pos, r, fieldFormats ){
	fieldFormats.forEach( ( format, i ) => {
		const
			s = format.size ?? 1,
			f = format.factor ?? 1,
			o = format.offset ?? 0,
//			v = Math.round( r[ i ] * f + o );
			v = Math.round( r[ i ] * f - o );

		if( format.type == 1 ){	// RGB型
			buf.set( r[ i ], pos * 4 );
		} else {
			if( s == 2 ){
				DataPng.setInt48( buf, v, pos * 4 );
			} else {		// format.size == 2以外はすべて24bit整数として読み込む
				DataPng.setInt24( buf, v, pos * 4 );
			}
		}
		pos += s;
	} );
}

function changeVerticalPriority( listPng ){
	const
		recordCount = listPng.records.length,
		recordLength = listPng.recordLength,
		size = recordCount * recordLength + listPng.headerLength,	// 出力ピクセル数
		// w: 出力画像幅
		w = Math.floor( Math.sqrt( size ) / recordLength ) * recordLength,
							// 幅と高さがほぼ等しく，かつ幅が3の倍数になるように
		h = Math.ceil( size / w ),								// 出力画像高さ
		i0 = recordCount % ( w / recordLength ),
		newRecords = [],
		results = [];

	listPng.records.forEach( ( r, k )  => {
		const
			d = k < i0 * h,
			h2 = d ? h : h - 1,
			k2 = d ? k : k - i0,
			j = k2 % h2,
			i = ( k2 - j ) / h2;

		results[ k ] = i + j * w /  recordLength;
		newRecords[ i + j * w /  recordLength ] = r
	} );
	listPng.records = newRecords;
	return results;
}

function changeOrder( listPng, order ){
	const
		newRecords = [];

	listPng.records.forEach( ( r, i ) => {
		newRecords[ order[ i ] ] = r
	} );
	listPng.records = newRecords;
}

function toImageData( listPng, omitHeader = false, recordWriter ){
//function toImageData( listPng, omitHeader = false, optimize = true, recordWriter ){
	const
		headerLength = listPng.headerLength,
		recordCount = listPng.records.length,
		recordLength = listPng.recordLength,
		size = recordCount * recordLength + headerLength,	// 出力ピクセル数
		// w: 出力画像幅
		w = Math.floor( Math.sqrt( size ) / recordLength ) * recordLength,
							// 幅と高さがほぼ等しく，かつ幅が3の倍数になるように
		h = Math.ceil( size / w ),								// 出力画像高さ
		buf = new Uint8ClampedArray( w * h * 4 ),				// 型付き配列
		i0 = recordCount % ( w / recordLength ),
		pos0 = omitHeader ? 0 : headerLength;

	recordWriter = recordWriter || defaultRecordWriter;
	// ヘッダー出力
	if( !omitHeader ){
		DataPng.setInt24( buf, listPng.type );
		DataPng.setInt24( buf, headerLength, 4 );
		DataPng.setInt24( buf, recordLength, 8 );
		DataPng.setInt48( buf, recordCount, 12 );
	}
	for( let i = 5; i < headerLength; i++ ){
		DataPng.setInt24( buf, listPng.otherHeader[ i - 5 ], i * 4 );
	} 

	// レコードの出力
	for( let k = 0; k < recordCount; k++ ){
		const
			d = k < i0 * h,
			h2 = d ? h : h - 1,
			k2 = d ? k : k - i0;
		let
			pos;

/*		if( optimize ) {
			const
				j = k2 % h2,
				i = ( k2 - j ) / h2;

			pos = pos0 + i * recordLength + j * w;
		} else {
			pos = pos0 + k * recordLength;
		}
*/
			pos = pos0 + k * recordLength;

		recordWriter( buf, pos, listPng.records[ k ], listPng.fieldFormats );
	}
	return new ImageData( buf, w );
}

function toCanvas( listPng, omitHeader = false, recordWriter ){
//function toCanvas( listPng, omitHeader = false, optimize = true, recordWriter ){
	return Canvas.fromImageData( toImageData( listPng, omitHeader, recordWriter || defaultRecordWriter ) );
}

//// 読み込み関連

// 1レコード分のデータを読み込みむ標準的な処理を行います．
// buf: ImageData.data
// pos: 位置（バイト単位）
function defaultRecordReader( buf, pos, fieldFormats ){
	return fieldFormats.map( format => {
		const
			factor = format.factor ?? 1,
			offset = format.offset ?? 0,
			type = format.type ?? 2,	// デフォルト符号付き整数
			size = format.size ?? 1;
		let
			v;

		switch( type ){
			case 1: // RGB
				v = data.slice( pos * 4, pos * 4 + 3 );
			case 2: // 符号付き整数
				if( size == 1 ) {
					v = DataPng.getInt24( buf, pos * 4 );
				} else {
					v = DataPng.getInt48( buf, pos * 4 );
				}
				v = ( v + offset ) / factor;	// 2021-06-22でoffsetの符号反転
				break;
			case 3:	// 符号無し整数
				if( size == 1 ) {
					v = DataPng.getUint24( buf, pos * 4 );
				} else {
					v = DataPng.getUint48( buf, pos * 4 );
				}
				v = ( v - offset ) / factor;
				break;
			}
			pos += size;
		return v;
	} );
}

// fromImageData() ImageDataから点群PNGをロードします．
function fromImageData( imageData, fieldFormats, recordReader = defaultRecordReader ){
	const
		d = imageData.data,
		recordCount = DataPng.getUint48( d, 12 ),
		listPng = {
			type: DataPng.getUint24( d, 0 ),
			headerLength: DataPng.getUint24( d, 4 ),
			recordLength: DataPng.getUint24( d, 8 ),
//			recordCount: DataPng.getUint48( d, 12 ),
			records: [],
			otherHeader: [],
			fieldFormats: fieldFormats ?? new Array( DataPng.getUint24( d, 8 ) ).fill( {} )
		},
		headerLength = listPng.headerLength;
	let
		p = headerLength;

	for( let i = 5; i < headerLength; i++ ){
		listPng.otherHeader.push( DataPng.getUint24( d, i * 4 ) );
	}

	for( let k = 0; k < recordCount; k++ ){
		listPng.records.push( recordReader( d, p, listPng.fieldFormats ) );
		p += listPng.recordLength;
	}
	return listPng;
}

async function loadListPng( url, fieldFormats, recordReader ){
	return fromImageData( ( await Canvas.loadImageData( url ) ), fieldFormats, recordReader )
}

// 関数 headerFromImageData()
// ImageDataからリストPNGのヘッダーのみをロードします．
function headerFromImageData( imageData ){
	const
		data = imageData.data,
		header = {
			type: DataPng.getUint24( data, 0 ),
			headerLength: DataPng.getUint24( data, 4 ),
			recordLength: DataPng.getUint24( data, 8 ),
			recordCount: DataPng.getUint48( data, 12 ),
			otherHeader: []
		};

	for( let i = 5; i < header.headerLength; i++ ){
		header.otherHeader.push( DataPng.getUint24( data, i * 4 ) );
	}
	return header;
}

// 関数 loadListPngHeader()
// urlからリストPNGのヘッダーのみをロードします．
async function loadListPngHeader( url ){
	return headerFromImageData( await Canvas.loadImageData( url ) )
}

export { convertList, createListPng, changeVerticalPriority, 
	changeOrder, toImageData, toCanvas, fromImageData, loadListPng,
	headerFromImageData, loadListPngHeader }
export * from './dataPng.js';