const parser = require('html-dom-parser');

export const ArticleTemplate = (msgId, msgData) => {

    var HTMLtext = '<div id="msg_" class="fromOtherUsers fromCurrentUser with-icon"> \
    <div class="article-template">\
         <div class="profile-photo"> <div class="user-account avtar" style="background-image:url"></div> </div> \
         \
             <div class="article-template-content" actionObj="">\
             <div class="article-template-elements" id="wrapper" style="padding:4px 9px;">';
    HTMLtext += '<div class="article-template-elements">';
    HTMLtext += '<div class="media-block media-blue">';

    let data = msgData?.message?.[0]?.component?.payload?.elements || msgData?.payload?.elements

    data.forEach((item) => {
        console.log(item.title);
        var artititle = item.title
        var art_description = item.description
        var updatedOn = item.updatedOn
        var createdOn = item.createdOn
        var icon = item.icon
        var button_url = item.button.url
        var wrapper = document.getElementById('wrapper');
        artititle = artititle.split('*').join(' ');
        //art_description = art_description.split('((https://').join(' ');
        var art_description = art_description.replace(/ *\([^)]*\) */g, "</br></br>");
        var description_ = markdownConvert(art_description)

        HTMLtext += '<div class="media-header" id="media-header">' + artititle + '</div>';
        HTMLtext += '<div class="media-desc">' + description_ + '</div>';
        HTMLtext += '<div class="media-space-between">\
            <div class="media-icon-block">\
            <div class="media-icon">\
            <img src="'+ icon + '"/>\
            </div>\
            <div class="media-icon-desc">\
            <div class="media-icon-desc-data">'+ createdOn + '</div>\
            <div class="media-icon-desc-data">'+ updatedOn + '</div>\
            </div>\
            </div>\
            <div><a href="'+ button_url + '" target="_blank"><button class="btn-primary btn" type="url" url="' + button_url + '" style="">Show Article</button></a></div>\
            </div>';
    })
    // for (var i=0; i<msgData.message[0].component.payload.buttons.length; i++) {
    //    HTMLtext += '<button type="button" class="bannerTemplate_button" onclick="submitBannerOption(\''+msgData.message[0].component.payload.buttons[i].payload+'\');">'+msgData.message[0].component.payload.buttons[i].title+'</button>';
    //}

    HTMLtext += '</div>';
    HTMLtext += '</div>';

    HTMLtext += '</div>';
    HTMLtext += '</div>';
    HTMLtext += '</div>';
    HTMLtext += '</div>';

    // return parseHTML(HTMLtext);
    return HTMLtext;
}

function markdownConvert(string) {
    return string.replaceAll('\n', '<br>');
}