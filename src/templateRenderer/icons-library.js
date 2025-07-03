const config = {
    color: '#667085',
    color1: '#667085',
    color2: '#667085',
    size: 20
}

export function createDeleteIcon({ size = config.size, color = config.color, className = '' }) {
    const SVG_NS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 12 12');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('class', `wa-Delete ${className}`);

    const pathData = [
        {
            d: "M5.02211 4.93363C5.2924 4.93363 5.51435 5.14057 5.53818 5.40465L5.5403 5.45182V8.74091C5.5403 9.02709 5.3083 9.25909 5.02211 9.25909C4.75182 9.25909 4.52987 9.05216 4.50604 8.78807L4.50393 8.74091V5.45182C4.50393 5.16563 4.73593 4.93363 5.02211 4.93363Z",
            fill: color
        },
        {
            d: "M7.73091 5.40465C7.70708 5.14057 7.48513 4.93363 7.21484 4.93363C6.92865 4.93363 6.69665 5.16563 6.69665 5.45182V8.74091L6.69877 8.78807C6.7226 9.05216 6.94455 9.25909 7.21484 9.25909C7.50102 9.25909 7.73303 9.02709 7.73303 8.74091V5.45182L7.73091 5.40465Z",
            fill: color
        },
        {
            d: "M7.21484 0C8.08306 0 8.79123 0.685314 8.8279 1.54451L8.82939 1.61455V2.19273H11.0521C11.3383 2.19273 11.5703 2.42473 11.5703 2.71091C11.5703 2.9812 11.3634 3.20315 11.0993 3.22698L11.0521 3.2291H10.4739V10.3855C10.4739 11.2537 9.78862 11.9618 8.92942 11.9985L8.85938 12H3.37757C2.50934 12 1.80118 11.3147 1.76451 10.4555L1.76302 10.3855V3.2291H1.18484C0.898657 3.2291 0.666656 2.9971 0.666656 2.71091C0.666656 2.44062 0.873595 2.21867 1.13768 2.19484L1.18484 2.19273H3.40756V1.61455C3.40756 0.746324 4.09288 0.0381621 4.95208 0.00149169L5.02211 0H7.21484ZM2.79939 3.2291V10.3855C2.79939 10.6888 3.03301 10.9376 3.33015 10.9617L3.37757 10.9636H8.85938C9.16273 10.9636 9.41152 10.73 9.43564 10.4329L9.43756 10.3855V3.2291H2.79939ZM7.79301 2.19273H4.44394V1.61455L4.44585 1.56713C4.46997 1.26999 4.71876 1.03637 5.02211 1.03637H7.21484L7.26226 1.03829C7.55939 1.06241 7.79301 1.3112 7.79301 1.61455V2.19273Z",
            fill: color,
            fillRule: 'evenodd',
            clipRule: 'evenodd'
        }
    ];

    for (const pathInfo of pathData) {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', pathInfo.d);
        path.setAttribute('fill', pathInfo.fill);
        if (pathInfo.fillRule) path.setAttribute('fill-rule', pathInfo.fillRule);
        if (pathInfo.clipRule) path.setAttribute('clip-rule', pathInfo.clipRule);
        svg.appendChild(path);
    }

    return svg;
}

export function createCopyIcon({ size = config.size, color = config.color, className = "" } = {}) {
    const svgNS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("fill", "none");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute('class', `wa-copy ${className}`);

    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("clip-path", "url(#clip0_2278_37840)");

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M10.6666 10.6673V12.534C10.6666 13.2807 10.6666 13.6541 10.5213 13.9393C10.3934 14.1902 10.1895 14.3942 9.93857 14.522C9.65336 14.6673 9.27999 14.6673 8.53325 14.6673H3.46659C2.71985 14.6673 2.34648 14.6673 2.06126 14.522C1.81038 14.3942 1.60641 14.1902 1.47858 13.9393C1.33325 13.6541 1.33325 13.2807 1.33325 12.534V7.46732C1.33325 6.72058 1.33325 6.34721 1.47858 6.062C1.60641 5.81111 1.81038 5.60714 2.06126 5.47931C2.34648 5.33398 2.71985 5.33398 3.46659 5.33398H5.33325M7.46658 10.6673H12.5333C13.28 10.6673 13.6534 10.6673 13.9386 10.522C14.1895 10.3942 14.3934 10.1902 14.5213 9.9393C14.6666 9.65409 14.6666 9.28072 14.6666 8.53398V3.46732C14.6666 2.72058 14.6666 2.34721 14.5213 2.062C14.3934 1.81111 14.1895 1.60714 13.9386 1.47931C13.6534 1.33398 13.28 1.33398 12.5333 1.33398H7.46658C6.71985 1.33398 6.34648 1.33398 6.06126 1.47931C5.81038 1.60714 5.60641 1.81111 5.47858 2.062C5.33325 2.34721 5.33325 2.72058 5.33325 3.46732V8.53398C5.33325 9.28072 5.33325 9.65409 5.47858 9.9393C5.60641 10.1902 5.81038 10.3942 6.06126 10.522C6.34648 10.6673 6.71985 10.6673 7.46658 10.6673Z");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "1.33333");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    const defs = document.createElementNS(svgNS, "defs");
    const clipPath = document.createElementNS(svgNS, "clipPath");
    clipPath.setAttribute("id", "clip0_2278_37840");

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("width", "16");
    rect.setAttribute("height", "16");
    rect.setAttribute("fill", "white");

    clipPath.appendChild(rect);
    defs.appendChild(clipPath);

    g.appendChild(path);
    svg.appendChild(g);
    svg.appendChild(defs);

    return svg;
}

export function createExport({ size = config.size, color = config.color, className = "" } = {}) {
    const svgNS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("fill", "none");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute('class', `wa-export ${className}`);

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M14 8V10.8C14 11.9201 14 12.4802 13.782 12.908C13.5903 13.2843 13.2843 13.5903 12.908 13.782C12.4802 14 11.9201 14 10.8 14H5.2C4.07989 14 3.51984 14 3.09202 13.782C2.71569 13.5903 2.40973 13.2843 2.21799 12.908C2 12.4802 2 11.9201 2 10.8V8M10.6667 4.66667L8 2M8 2L5.33333 4.66667M8 2V10");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "1.33333");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    svg.appendChild(path);

    return svg;
}

export function createThumbsDown({ size = config.size, color = config.color, className = "" } = {}) {
    const svgNS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("fill", "none");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute('class', `wa-thumbs-down ${className}`);

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M11.3333 1.33398V8.66732M14.6666 6.53398V3.46732C14.6666 2.72058 14.6666 2.34721 14.5213 2.062C14.3935 1.81111 14.1895 1.60714 13.9386 1.47931C13.6534 1.33398 13.28 1.33398 12.5333 1.33398H5.41196C4.43764 1.33398 3.95048 1.33398 3.55701 1.51227C3.21022 1.66941 2.91549 1.92227 2.70745 2.24113C2.4714 2.60291 2.39732 3.08441 2.24917 4.0474L1.90045 6.31407C1.70505 7.58419 1.60735 8.21926 1.79582 8.7134C1.96125 9.14711 2.27239 9.50978 2.6759 9.73923C3.13564 10.0007 3.77818 10.0007 5.06324 10.0007H5.59995C5.97332 10.0007 6.16001 10.0007 6.30261 10.0733C6.42806 10.1372 6.53004 10.2392 6.59396 10.3647C6.66662 10.5073 6.66662 10.6939 6.66662 11.0673V13.0234C6.66662 13.9313 7.40262 14.6673 8.31051 14.6673C8.52706 14.6673 8.7233 14.5398 8.81125 14.3419L11.0518 9.30077C11.1537 9.07148 11.2046 8.95684 11.2852 8.87278C11.3563 8.79847 11.4438 8.74165 11.5406 8.70678C11.6501 8.66732 11.7756 8.66732 12.0265 8.66732H12.5333C13.28 8.66732 13.6534 8.66732 13.9386 8.52199C14.1895 8.39416 14.3935 8.19019 14.5213 7.93931C14.6666 7.65409 14.6666 7.28072 14.6666 6.53398Z");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "1.33333");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    svg.appendChild(path);
    return svg;
}

export function createThumbsUp({ size = config.size, color = config.color, className = "" } = {}) {
    const svgNS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("fill", "none");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute('class', `wa-thumbs-up ${className}`);

    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("clip-path", "url(#clip0_2278_37846)");

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M4.66659 14.6673V7.33398M1.33325 8.66732V13.334C1.33325 14.0704 1.93021 14.6673 2.66659 14.6673H11.6174C12.6046 14.6673 13.4441 13.9471 13.5942 12.9714L14.3121 8.30477C14.4985 7.09325 13.5611 6.00065 12.3354 6.00065H9.99992C9.63173 6.00065 9.33325 5.70217 9.33325 5.33398V2.97788C9.33325 2.06998 8.59726 1.33398 7.68936 1.33398C7.47281 1.33398 7.27657 1.46151 7.18862 1.6594L4.84254 6.93808C4.73554 7.17883 4.4968 7.33398 4.23334 7.33398H2.66659C1.93021 7.33398 1.33325 7.93094 1.33325 8.66732Z");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "1.33333");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    g.appendChild(path);
    svg.appendChild(g);

    const defs = document.createElementNS(svgNS, "defs");
    const clipPath = document.createElementNS(svgNS, "clipPath");
    clipPath.setAttribute("id", "clip0_2278_37846");

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("width", "16");
    rect.setAttribute("height", "16");
    rect.setAttribute("fill", "white");

    clipPath.appendChild(rect);
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    return svg;
}
