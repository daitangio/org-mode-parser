OrgQuery.prototype.toHTML = function() {
  var self = this;
  self.MAX_HEADLINE_LEVEL = 6;

  function render_headline(node) {
    if(node.level <= self.MAX_HEADLINE_LEVEL)
    return "<h"+node.level+">"+node.headline+"</h"+node.level+">";
  }
  function paragraphparser(paragraph) {
    return paragraph.split("\n").map(lineparser).join("")
  }
  function lineparser(line) {
    // get a quick and dirty render first
    return line
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
      // horizontal rule
      .replace(/-{5,}\W*$/, '<hr />')
      // hyperlink with description
      .replace(/\[\[(?:file:)?(.*?)\]\[(.*?)\]\]/i, '<a href="$1">$2</a>')
      // hyperlink without description
      .replace(/\[\[(?:file:)?(.*?)\]\]/i, '<a href="$1">$1</a> no desc')
      // image file
      .replace(/file:([^ ]+)\.(?:PNG|JPG|BMP|GIF|TIFF|SVG)/i, '<img src="$1" alt="$1" />')
      // lists
      // shouldn't be processed at this level line parser here
      // won't group list items together
      //// definition list
      .replace(/- +([^ ]+) :: (.+)/, '<dl><dt>$1</dt><dd>$2</dd></dl>')
      //// plain
      .replace(/- (.+)/, '<li>$1</li>')
      //// ordered
      .replace(/\d+\. (.+)/, '<li>$1</li>')
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