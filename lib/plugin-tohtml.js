OrgQuery.prototype.toHTML = function() {
  var self = this;
  self.MAX_HEADLINE_LEVEL = 6;
  self.OL = 'ol';
  self.UL = 'ul';
  self.DL = 'dl';

  function render_headline(node) {
    if(node.level <= self.MAX_HEADLINE_LEVEL)
    return "<h"+node.level+">"+node.headline+"</h"+node.level+">";
  }
  function paragraphparser(paragraph) {
    var artn = []
    var lastgroup = null
    var lsline = paragraph.split("\n")
    for(var i = 0, n = lsline.length; i < n; ++i) {
      var parsed = lineparser(lsline[i])
      if(parsed[0] && lastgroup === null) {
        artn.push("<"+parsed[0]+">")
      }
      artn.push(parsed[1])
      if(lastgroup && (parsed[0] !== lastgroup || i == n-1)) {
        artn.push("</"+lastgroup+">")
        lastgroup = null;
      } else {
        lastgroup = parsed[0]
      }
    }
    return artn.join("\n")
  }
  function lineparser(line) {
    // horizontal rule
    var line1 = line.replace(/-{5,}\s*$/, '<hr />')
    if(line1 != line) {
      return [null, line1];
    }

    // simple markup
    line = line
      // code
      .replace(/=([^=]+?)=/g, '<code>$1</code>')
      // verbatim
      .replace(/~([^~]+?)~/g, '<code>$1</code>')
      // italic
      .replace(/\/(.+?)\//g, '<i>$1</i>')
      // bold
      .replace(/\*([^\*]+?)\*/g, '<b>$1</b>')
      // underline
      .replace(/_([^_]+?)_/g, '<span style="text-decoration:underline">$1</span>')
      // image file, double bracket
      .replace(/\[\[file:\s*([^ ]+)\.(?:PNG|JPG|BMP|GIF|TIFF|SVG)\]\]/i, '<img src="$1" alt="$1" />')
      // image file, no bracket
      .replace(/(?:^|[^[])file:([^ ]+)\.(?:PNG|JPG|BMP|GIF|TIFF|SVG)(?:[^\]]|$)/i, '<img src="$1" alt="$1" />')
      // hyperlink with description
      .replace(/\[\[(?:file:)?(.*?)\]\[(.*?)\]\]/i, '<a href="$1">$2</a>')
      // hyperlink without description
      .replace(/\[\[(?:file:)?(.*?)\]\]/i, '<a href="$1">$1</a>')
      // begin source
      .replace(/^#\+begin_src\s+([^ ]+)(.*)/i, '<code class="$1">')
      // end source
      .replace(/^#\+end_src\s*/i, '</code>')

    // lists
    //// definition list
    line1 = line.replace(/- +([^ ]+) :: (.+)/, '<dt>$1</dt><dd>$2</dd>')
    if(line1 != line) return [self.DL, line1]
    //// ordered
    line1 = line.replace(/\d+[\.)] (.+)/, '<li>$1</li>')
    if(line1 != line) return [self.OL, line1]
    //// unordered
    line1 = line.replace(/[-+] (.+)/, '<li>$1</li>')
    if(line1 != line) return [self.UL, line1]

    return [null, line1]
  }

  console.log(this)
  var rtn = ""
  for(var i = 0; i < oq.allNodes.length; ++i) {
    node = oq.allNodes[i]
    if(node.headline) {
      rtn += render_headline(node)
    }
    rtn += "<p>" + node.body.split("\n\n").map(paragraphparser).join("</p><p>") + "</p>"
  }
  return rtn
}