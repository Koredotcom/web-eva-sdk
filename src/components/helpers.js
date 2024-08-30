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