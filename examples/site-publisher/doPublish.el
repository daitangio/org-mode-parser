
; The following code is needed if org-mode is installed under .emacs.d 
; as in my config. 
;;(add-to-list 'load-path "~/.emacs.d/org-7.7/lisp")

(require 'org-publish)
(setq org-publish-project-alist
      '(

        ;; ... add all the components here (see below)...
        ("org-notes"
         :base-directory "~/org-mode-parser/examples/site-publisher/org"
         :base-extension "org"
         :publishing-directory "~/org-mode-parser/examples/site-publisher/public_html"
         :recursive t
         :publishing-function org-publish-org-to-html
         :headline-levels 4             ; Just the default for this project.
         :auto-preamble t
  
         :auto-sitemap t                ; Generate sitemap.org automagically...
         :sitemap-filename "sitemap.org"  ; ... call it sitemap.org (it's the default)...
         :sitemap-title "Sitemap"         ; ... with title 'Sitemap'.
         :sitemap-function org-publish-org-sitemap
         )

        ("org-static"
         :base-directory "~/org-mode-parser/examples/site-publisher/org"
         :base-extension "css\\|js\\|png\\|jpg\\|gif\\|pdf\\|mp3\\|ogg\\|swf"
         :publishing-directory "~/org-mode-parser/examples/site-publisher/public_html"
         :recursive t
         :publishing-function org-publish-attachment
         )

        ("nodejsWebSiteExample" :components ("org-notes" "org-static"))


        ))

;; Issue the publish command.
(org-publish (assoc "nodejsWebSiteExample" org-publish-project-alist))
(message "Site published")
;; To publish all projects...
;;(org-publish-all)
