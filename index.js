var globby = require('globby'),
    mkdirp = require('mkdirp'),
    fs     = require('fs')

/** 
 * Walc class definition
 *
 */
var Walc = function (options) {

  // default values
  var path           = null,
      dest           = 'dest/',
      actions        = ['remove', 'comment', 'ignore'],
      defaultAction  = 'ignore',
      oldAction      = defaultAction,
      methods        = {'console': defaultAction, 'alert': defaultAction},
      consoleAction  = defaultAction,
      alertAction    = defaultAction,
      action

  // override default values if exists in options objects 
  if (typeof options === 'object') {

    path          = (typeof options.path === 'string' || typeof options.path === 'object') ? options.path : path
    dest          = (typeof options.dest === 'string') ? options.dest : dest
    defaultAction = (typeof options.defaultAction === 'string' && actions.indexOf(options.defaultAction) >= 0) ? options.defaultAction : defaultAction

    if (dest.slice(-1) !== '/') 
      dest += '/'

    if (typeof options.methods === 'object') {

      for (var i = 0, arr = Object.keys(methods), len = arr.length; i < len; i++) {
        action = arr[i]
        methods[action] = (typeof options.methods[action] === 'string' && actions.indexOf(options.methods[action]) >= 0 ) ? options.methods[action] : defaultAction
      }

    } else if (typeof options.defaultAction === 'string' && options.defaultAction !== oldAction) {
      methods = {'console': defaultAction, 'alert': defaultAction}
    }

  }
  else if (typeof options === 'string') {
    path = options
  }

  /**
   * static params
   * reachable via `this.getParam(param)`
   */
  var params = {

    'pathSrc': path,

    'pathDest': dest,

    'actions': actions,

    'defaultAction': defaultAction,
    
    // method : action
    'methods': methods,

    'quotesRegex': /((\"|\')(.+?)(\"|\'))/gi,

    'mainRegex': /(((\/\/\s*)?(\/\*\s*)?)+?)(((console)\.([a-z]+)|(alert))\((.+?)\);?)(((\s*\*\/)?)+?)/gi,

    'files': []

  }

  // setter to push path into private var `files`
  this.setFiles = function(files) {
    return params['files'] = files || []
  }

  // getter to parse `params` private object
  this.getParam = function(name) {
    return params[name]
  }

  // create destination directory if not exists
  if (params.pathSrc !== null) {
    //try{ fs.mkdirSync( params.pathDest ) } catch (err) {  }
    try{ mkdirp.sync(params.pathDest) } catch (err) {  }
  }

}


Walc.prototype = {

  run: function() {

    var walc = this,
        path = walc.getParam('pathSrc')

    if (path === null) {
      console.log('Walc : `path` is not defined')
      process.exit(0)
    }
    
    var files    = globby.sync( path ),
        comments = false,
        file,
        segments,
        filename,
        data

    for (var i = 0, len = files.length; i < len; i++) {
      
      // path file to read
      file = files[i]

      // split path file to get the file name
      segments = file.split('/')
      filename = segments[segments.length-1]

      // read file
      data = fs.readFileSync(file, {encoding: 'utf8'})

      data = walc.process(data)

      // and write the new content to path dest
      fs.writeFileSync(walc.getParam('pathDest') + filename, data)
    }
  },

  process: function(data) {
  
    var walc          = this,
        mainRegex     = walc.getParam('mainRegex'),
        methods       = walc.getParam('methods'),
        actions       = walc.getParam('actions'),
        currentAction = null,
        is

    // transform ')' to '&#40;' => cause to mainRegex match, try to fix it...
    data = walc.brackets(data)
      
    // replace 'console' and 'alert' by comment or remove. Ignore if already comment
    data = data.replace(mainRegex, function (match, startComments, $2, $3, $4, stringToAction, isAlert, isConsole, typeConsole, $9, brackets, endComments, $12, offset, string) {

      if (startComments !== '') return startComments + stringToAction + endComments

      is             = isConsole || isAlert
      currentAction  = (typeof is === 'string' && actions.indexOf(methods[is]) >= 0) ? methods[is] : walc.getParam('defaultAction')

      switch(currentAction) {
        case 'remove' :
          return '';
          break;
        case 'comment' :
          return '/* ' + stringToAction + ' */';
          break;
        default:
          return stringToAction
          break;
      }



    })

    // transform '&#40;' to ')' => cause to mainRegex match, try to fix it...
    data = walc.brackets(data, true)

    return data
  },

  brackets: function(data, reverse) {

    var quotesRegex  = this.getParam('quotesRegex'),
        matchReplace = [')', '&#40;']

    if (reverse === true)
      matchReplace.reverse()

    var reg = new RegExp('\\' + matchReplace[0], 'i')

    return data.replace(quotesRegex, function (match, $1, typeQuote, toCheck, $4, offset, string) {

      if (toCheck.match(reg))
        toCheck = toCheck.replace(matchReplace[0], matchReplace[1])
      
      return typeQuote + toCheck + typeQuote

    })

  }

} 


/**
 * Module exports
 *
 */
module.exports = function(options) {
  return new Walc(options)
}