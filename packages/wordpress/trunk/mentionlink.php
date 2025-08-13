<?php
/**
 * Plugin Name: Mentionlink
 * Plugin URI: https://docs.mentionlink.com/setup/wordpress/
 * Description: Automatically embed the Mentionlink script to enable product mention detection and affiliate link conversion.
 * Version: 1.0.1
 * Author: Mentionlink
 * Author URI: https://mentionlink.com/
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: mentionlink
 */

// Prevent direct access
if (!defined('ABSPATH')) {
  exit;
}

/**
 * Mentionlink Plugin Class
 */
class MentionLink {

  /**
   * Plugin version
   */
  const VERSION = '1.0.0';

  /**
   * Option name for storing the domain setting
   */
  const OPTION_NAME = 'mentionlink_domain';

  /**
   * Default domain value
   */
  const DEFAULT_DOMAIN = 'example.com';

  /**
   * Constructor
   */
  public function __construct() {
    add_action('init', array($this, 'init'));
  }

  /**
   * Initialize the plugin
   */
  public function init() {
    add_action('wp_enqueue_scripts', array($this, 'enqueue_script'));
    add_action('admin_menu', array($this, 'add_admin_menu'));
    add_action('admin_init', array($this, 'register_settings'));
  }

  public function enqueue_script() {
    $domain = get_option(self::OPTION_NAME, self::DEFAULT_DOMAIN);

    wp_enqueue_script(
      'mentionlink-script',
      'https://cdn.mentionlink.com/v1/script.min.js',
      array(),
      self::VERSION,
      array()
    );

    add_filter('script_loader_tag', function($tag, $handle, $src) use ($domain) {
      if ('mentionlink-script' === $handle) {
        $tag = str_replace(' src=', ' async data-domain="' . esc_attr($domain) . '" src=', $tag);
      }

      return $tag;
    }, 10, 3);
  }

  public function add_admin_menu() {
    add_options_page(
      'Mentionlink Settings',
      'Mentionlink',
      'manage_options',
      'mentionlink-settings',
      array($this, 'admin_page')
    );
  }

  public function register_settings() {
    register_setting(
      'mentionlink_settings_group',
      self::OPTION_NAME,
      array(
        'type' => 'string',
        'sanitize_callback' => array($this, 'sanitize_domain'),
        'default' => self::DEFAULT_DOMAIN
      )
    );

    add_settings_section(
      'mentionlink_main_section',
      'Mentionlink Configuration',
      array($this, 'settings_section_callback'),
      'mentionlink-settings'
    );

    add_settings_field(
      'mentionlink_domain_field',
      'Domain',
      array($this, 'domain_field_callback'),
      'mentionlink-settings',
      'mentionlink_main_section'
    );
  }

  /**
   * Sanitize domain input
   */
  public function sanitize_domain($input) {
    // Remove any unwanted characters and validate domain format
    $domain = sanitize_text_field($input);

    // Basic domain validation - allow letters, numbers, dots, and hyphens
    if (!preg_match('/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $domain)) {
      add_settings_error(
        self::OPTION_NAME,
        'invalid_domain',
        'Please enter a valid domain name (e.g., example.com)',
        'error'
      );
      return get_option(self::OPTION_NAME, self::DEFAULT_DOMAIN);
    }

    return $domain;
  }

  /**
   * Settings section callback
   */
  public function settings_section_callback() {
    echo '<p>Configure your Mentionlink settings below. The domain will be used in the data-domain attribute of the Mentionlink script.</p>';
  }

  /**
   * Domain field callback
   */
  public function domain_field_callback() {
    $domain = get_option(self::OPTION_NAME, self::DEFAULT_DOMAIN);

    echo "<input type='text' id='mentionlink_domain' name='" . esc_attr(self::OPTION_NAME) . "' value='" . esc_attr($domain) . "' class='regular-text' />";
    echo "<p class='description'>Enter your domain name (e.g., example.com). This will be used in the data-domain attribute of the Mentionlink script.</p>";
  }
  /**
   * Admin page content
   */
  public function admin_page() {
    // Check user capabilities
    if (!current_user_can('manage_options')) {
      return;
    }

    // Handle settings errors
    settings_errors('mentionlink_settings_group');
    ?>
    <div class="wrap">
      <h1><?php echo esc_html(get_admin_page_title()); ?></h1>

      <div class="card">
        <h2>About Mentionlink</h2>
        <p>Mentionlink automatically detects product mentions on your website and converts them into affiliate links to help you monetize your content.</p>
        <p>This embeds the Mentionlink script in your website's head section with your custom domain configuration.</p>
      </div>

      <form action="options.php" method="post">
        <?php
        settings_fields('mentionlink_settings_group');
        do_settings_sections('mentionlink-settings');
        submit_button('Save Settings');
        ?>
      </form>

      <div class="card">
        <h3>Current Script Output</h3>
        <p>The following script will be embedded in your website's head section:</p>
        <?php
        $domain = get_option(self::OPTION_NAME, self::DEFAULT_DOMAIN);
        ?>
        <code>&lt;script async data-domain="<?php echo esc_attr($domain); ?>" src="https://cdn.mentionlink.com/v1/script.min.js"&gt;&lt;/script&gt;</code>
      </div>
    </div>
    <?php
  }
}

// Initialize the plugin
new MentionLink();