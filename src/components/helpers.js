export const getUID = function (len) {
    len = len || 10;
    var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return [...Array(len)].reduce(a => a + p[~~(Math.random() * p.length)], '');
}

export const getFileExtension = (fileName) => {
    const parts = fileName?.split('.');
    if (parts?.length > 1 && parts[parts?.length - 1].trim() !== '') {
        return parts[parts?.length - 1].toLowerCase();
    } else {
        return '';
    }
}

export const generateComponentId = () => {
    let cId = Math.random().toString(36).slice(2);
    return cId.substring(0, 6);
}

export const getQueryParams = (url) => {
    const queryParams = {};
    const queryString = url.split('?')[1]; // Split the URL at the '?' character to get the query string

    if (queryString) {
        const paramPairs = queryString.split('&'); // Split the query string into parameter pairs

        paramPairs.forEach(pair => {
            const [key, value] = pair.split('='); // Split each parameter pair into key and value
            queryParams[key] = decodeURIComponent(value); // Store the key-value pair in the result object
        });
    }

    return queryParams;
}

export const allowedFileTypes = ["3ga","3gpa","flac","imy","mid","midi","mka","ota","apng","avif",
    "avifs","psd","sgi","conf","cfg","csv","tsv","txt","text","log","doc","docm","docx","dot","dotm","dotx",
    "odp","ods","odt","oxps","pdf","pot","potm","potx","ppam","pps","ppsm","ppsx","ppt","pptm","pptx","rtf","xls",
    "xlsm","xlsx","xlt","xltm","xltx","xps","aspx","c","coffee","cpp","cxx","cs","css","dart","gradle","groovy","h",
    "haml","htaccess","ini","ipynb","java","js","json","jsp","kt","less","lisp","lua","m","makefile","md","mk",
    "nim","nsi","pas","php","pl","properties","ps1","py","r","rb","rbp","sass","scss","sh","sql","swift","tcl","vb",
    "xml","yml","yaml","htm","html","mhtml","xhtml","dat","eml","emlx","msg","oft","7z","bz2","bzip2","cbz","gz","gzip",
    "jar","rar","tar","tbz","tbz2","tar.bz2","tgz","tar.gz","z","zip","zipx","3dm","3ds","3g2","3gp2","accdb","ai",
    "aif","aiff","asf","asx","avi","bak","cab","cbr","cfm","cgi","csr","cur","db","dbf","deb","dll","dmp","drv",
    "eps","fnt","fon","ics","iff","indd","m3u","max","mdb","obj","otf","pct","pdb","pkg","ps","ra","rm","rpm","rss",
    "sdf","sldm","sldx","srt","swf","ttf","vcf","vob","wma","wmv","wpd","wps","xla","xlam","xll","xlm","xlsb","xlw",
    "aac","amr","m4a","mp3","ogg","oga","opus","wav","weba","bmp","gif","ico","jfif","jpeg","jpg","png","svg","tiff",
    "webp","3gp","flv","m4v","mkv","mov","mp4","mpeg","mpg","webm","wmv"];


export const filetypes = {
"audio": ["aac","amr","m4a","mp3","ogg","oga","opus","wav","weba"],
"video": ["3gp","flv","m4v","mkv","mov","mp4","mpeg","mpg","webm","wmv"],
"image": ["bmp","gif","ico","jfif","jpeg","jpg","png","svg","tiff","webp"]
};

export const getCidByMessageId = (data, messageId) => {
    for (const key in data) {
        if (data[key].messageId === messageId) {
            return data[key].cId;
        }
    }
    return null; // or an appropriate value if no match is found
};
