/* dataPng.js, 2021-06-25, 西岡 芳晴 ( NISHIOKA Yoshiharu )
データPNGを扱うためのモジュールです．
・必要とするライブラリ
　無し
●やること
・byteTo～，toByte～関連を使ってソースコードを整理
*/

//// 読み込み用
// 配列bufの位置posから3要素分を取りだして24bit符号無し整数に変換して返します．
function rgbToInt( buf, pos = 0 ){
	return buf[ pos ] * 65536 + buf[ pos + 1 ] * 256 + buf[ pos + 2 ];
}

// 型付き配列bufの位置posから，24ビット符号付き整数を取得します．
// 第4バイトが0ならNaNを返します．
function getInt24( buf, pos = 0 ){
	return buf[ pos + 3 ] ? rgbToInt( buf, pos ) << 8 >> 8 : NaN;
}

// 型付き配列bufの位置posから符号無し24ビット整数を取り出します．
// 第4バイトが0ならNaNを返します．
function getUint24( buf, pos = 0 ){
	return buf[ pos + 3 ] ? rgbToInt( buf, pos ) : NaN;
}
// 型付き配列bufの位置posから符号無し48ビット整数を取り出します．
// 第4バイト，第8バイトのどちらかが0ならNaNを返します．
function getUint48( buf, pos ){
	return getUint24( buf, pos ) * ( 2**24 ) + getUint24( buf, pos + 4 );
}

//// 書き込み用
// 24ビット整数v（符号付き，符号無しいずれも可）を2バイトに分割してbufの位置posに書き込みます．
function intToRgb( buf, v, pos = 0 ){
	buf.set( [ 0xff & v >> 16, 0xff & v >> 8, 0xff & v ], pos );
}

// 型付き配列に24ビット整数値を書き込み見ます．符号付き/無し両用です
function setInt24( buf, v, pos = 0 ){
	if( !isNaN( v ) && v !== null ){
		intToRgb( buf, v, pos );
		buf[ pos + 3 ] = 255;
	}
}

// 型付き配列に48ビット整数値を書き込み見ます．符号付き/無し両用です
function setInt48( buf, v, pos = 0 ){
	if( !isNaN( v ) && v !== null ){
		setInt24( buf, v / ( 2** 24 ), pos );
		setInt24( buf, v % ( 2** 24 ), pos + 4 );
	}
}

// int24ToByte関数
// 24ビット符号付き・無し整数を3バイトに分解します．
function int24ToByte( v ){
	return [ v >> 16 & 0xff, v >> 8 & 0xff, v & 0xff ]
}

// byteToUint24関数
// 3バイトをから24ビット符号無し整数を生成します．
// 3バイトは負号対応です
function byteToUint24( byte1, byte2, byte3 ){
	return Int8Array.of( byte1 )[ 0 ]  * 65536 
			+ Int8Array.of( byte2 )[ 0 ] * 256 + Uint8Array.of( byte3 )[ 0 ];
};

export { setInt24, setInt48, rgbToInt, getInt24, getUint24, getUint48,
		int24ToByte, byteToUint24 }
