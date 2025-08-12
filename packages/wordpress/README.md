# Mentionlink WordPress Plugin

- [How to use Subversion](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/)

```
svn co https://plugins.svn.wordpress.org/mentionlink wordpress

svn add trunk/*
svn ci -m 'adding version 1.0.1' --username TODO --password TODO
svn cp trunk tags/1.0.1
svn ci -m "tagging version 1.0.1"
```

## Validators

- [readme.txt validator](https://wordpress.org/plugins/developers/readme-validator/)