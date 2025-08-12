<?php
/**
 * Mentionlink Plugin Uninstall
 *
 * This file is executed when the plugin is deleted through the WordPress admin.
 * It removes all plugin data and settings from the database.
 */

// If uninstall not called from WordPress, then exit
if (!defined('WP_UNINSTALL_PLUGIN')) {
  exit;
}

// Delete the plugin option
delete_option('mentionlink_domain');

// For multisite installations, delete the option from all sites
if (is_multisite()) {
  $ids = get_sites(["fields" => "ids"]);

  foreach ($ids as $id) {
    switch_to_blog($id);
    delete_option("mentionlink_domain");
    restore_current_blog();
  }
}